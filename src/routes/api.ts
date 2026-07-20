import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parseWhatsApp } from '../parser/whatsapp-parser';
import { ConversationStore } from '../services/conversation-store';
import { calculateGeneralStats, calculateParticipantStats } from '../services/stats-service';
import { searchMessages } from '../services/search-service';
import { generateWordCloud } from '../services/wordcloud-service';
import { analyzeSentiment, getMessagesBySentiment } from '../services/sentiment-service';
import { analyzeTopics } from '../services/topics-service';
import { exportToJson, exportToCsv, exportToExcel } from '../services/export-service';
import { ConversationData } from '../types';
import { connectDB } from '../lib/mongodb';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { requireAuth, adminOnly, signToken, AuthPayload } from '../lib/auth';
import { sha256 } from '../lib/hash';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos .txt son permitidos'));
    }
  },
});

// --- Auth routes ---

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password y name son requeridos' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'pending';

    const user = new User({ email, password, name, role });
    await user.save();

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.role === 'pending') {
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por un administrador' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  const auth = (req as any).user as AuthPayload;
  const user = await User.findById(auth.userId).select('-password');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
});

router.get('/auth/pending-users', requireAuth, adminOnly, async (req: Request, res: Response) => {
  const users = await User.find({ role: 'pending' }).select('-password');
  res.json(users);
});

router.put('/auth/approve/:id', requireAuth, adminOnly, async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: 'user' }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ message: 'Usuario aprobado', user });
});

router.get('/auth/conversations', requireAuth, async (req: Request, res: Response) => {
  const auth = (req as any).user as AuthPayload;
  const convs = await ConversationStore.getConversationsByUser(auth.userId);
  res.json(convs);
});

// --- Upload ---

router.post('/upload', requireAuth, (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se ha subido ningun archivo' });
    }

    try {
      const content = req.file.buffer.toString('utf-8');
      const messages = parseWhatsApp(content);

      if (messages.length === 0) {
        return res.status(400).json({ success: false, error: 'No se pudieron extraer mensajes del archivo. Verifica que sea una exportacion valida de WhatsApp.' });
      }

      const participants = [...new Set(messages.filter(m => !m.isSystem).map(m => m.participant))];
      const dates = messages.filter(m => !m.isSystem).map(m => m.date).sort((a, b) => a.getTime() - b.getTime());

      const id = uuidv4();
      const fileHash = sha256(content);
      const auth = (req as any).user as AuthPayload;

      const conversationData: ConversationData = {
        id,
        fileName: req.file.originalname,
        messages,
        participants,
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        uploadedAt: new Date(),
      };

      await ConversationStore.set(id, conversationData, { userId: auth.userId, fileHash });

      res.json({
        success: true,
        conversationId: id,
        participants,
        messageCount: messages.length,
        dateRange: {
          start: dates[0],
          end: dates[dates.length - 1],
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      const msg = error instanceof Error ? error.message : 'Error al procesar el archivo';
      res.status(500).json({ success: false, error: msg });
    }
  });
});

// --- Conversation data helpers ---

async function getConvData(req: Request, res: Response): Promise<ConversationData | null> {
  const id = req.params.id as string;
  const data = await ConversationStore.get(id);
  if (!data) { res.status(404).json({ error: 'Conversacion no encontrada' }); return null; }
  return data;
}

// --- Stats & Analysis routes (all protected) ---

router.get('/conversation/:id/stats', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const stats = calculateGeneralStats(data);
  const participants = calculateParticipantStats(data);
  res.json({ stats, participants });
});

router.get('/conversation/:id/participants', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const participants = calculateParticipantStats(data);
  res.json(participants);
});

router.get('/conversation/:id/search', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const result = searchMessages(data, {
    q: req.query.q as string,
    participant: req.query.participant as string,
    fromDate: req.query.fromDate as string,
    toDate: req.query.toDate as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  });
  res.json(result);
});

router.get('/conversation/:id/wordcloud', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const wordcloud = generateWordCloud(data, limit);
  res.json(wordcloud);
});

router.get('/conversation/:id/sentiment', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const sentiment = analyzeSentiment(data);
  res.json(sentiment);
});

router.get('/conversation/:id/sentiment/messages/:type', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const type = req.params.type as string;
  if (!['positive', 'negative', 'neutral'].includes(type)) {
    return res.status(400).json({ error: 'Tipo invalido. Use: positive, negative, neutral' });
  }
  const messages = getMessagesBySentiment(data, type as 'positive' | 'negative' | 'neutral');
  res.json(messages);
});

router.get('/conversation/:id/topics', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;
  const topics = analyzeTopics(data);
  res.json(topics);
});

router.get('/conversation/:id/export/:format', requireAuth, async (req: Request, res: Response) => {
  const data = await getConvData(req, res);
  if (!data) return;

  const format = req.params.format;

  if (format === 'json') {
    const json = exportToJson(data);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="whatsapp-export-${req.params.id}.json"`);
    res.send(json);
  } else if (format === 'csv') {
    const csv = exportToCsv(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="whatsapp-export-${req.params.id}.csv"`);
    res.send('\uFEFF' + csv);
  } else if (format === 'xlsx') {
    try {
      const buffer = await exportToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="whatsapp-export-${req.params.id}.xlsx"`);
      res.send(buffer);
    } catch {
      res.status(500).json({ error: 'Error al generar Excel' });
    }
  } else {
    res.status(400).json({ error: 'Formato no soportado. Use json, csv o xlsx' });
  }
});

export default router;
