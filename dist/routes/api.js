"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const whatsapp_parser_1 = require("../parser/whatsapp-parser");
const conversation_store_1 = require("../services/conversation-store");
const stats_service_1 = require("../services/stats-service");
const search_service_1 = require("../services/search-service");
const wordcloud_service_1 = require("../services/wordcloud-service");
const sentiment_service_1 = require("../services/sentiment-service");
const topics_service_1 = require("../services/topics-service");
const export_service_1 = require("../services/export-service");
const mongodb_1 = require("../lib/mongodb");
const User_1 = require("../models/User");
const auth_1 = require("../lib/auth");
const hash_1 = require("../lib/hash");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.originalname.toLowerCase().endsWith('.txt')) {
            cb(null, true);
        }
        else {
            cb(new Error('Solo archivos .txt son permitidos'));
        }
    },
});
// --- Auth routes ---
router.post('/auth/register', async (req, res) => {
    try {
        await (0, mongodb_1.connectDB)();
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password y name son requeridos' });
        }
        const existing = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'El email ya está registrado' });
        }
        const userCount = await User_1.User.countDocuments();
        const role = userCount === 0 ? 'admin' : 'pending';
        const user = new User_1.User({ email, password, name, role });
        await user.save();
        const token = (0, auth_1.signToken)({ userId: user._id.toString(), email: user.email, role: user.role });
        res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});
router.post('/auth/login', async (req, res) => {
    try {
        await (0, mongodb_1.connectDB)();
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
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
        const token = (0, auth_1.signToken)({ userId: user._id.toString(), email: user.email, role: user.role });
        res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});
router.get('/auth/me', auth_1.requireAuth, async (req, res) => {
    const auth = req.user;
    const user = await User_1.User.findById(auth.userId).select('-password');
    if (!user)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
});
router.get('/auth/pending-users', auth_1.requireAuth, auth_1.adminOnly, async (req, res) => {
    const users = await User_1.User.find({ role: 'pending' }).select('-password');
    res.json(users);
});
router.put('/auth/approve/:id', auth_1.requireAuth, auth_1.adminOnly, async (req, res) => {
    const user = await User_1.User.findByIdAndUpdate(req.params.id, { role: 'user' }, { new: true }).select('-password');
    if (!user)
        return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario aprobado', user });
});
router.get('/auth/conversations', auth_1.requireAuth, async (req, res) => {
    const auth = req.user;
    const convs = await conversation_store_1.ConversationStore.getConversationsByUser(auth.userId);
    res.json(convs);
});
// --- Upload ---
router.post('/upload', auth_1.requireAuth, (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se ha subido ningun archivo' });
        }
        try {
            const content = req.file.buffer.toString('utf-8');
            const messages = (0, whatsapp_parser_1.parseWhatsApp)(content);
            if (messages.length === 0) {
                return res.status(400).json({ success: false, error: 'No se pudieron extraer mensajes del archivo. Verifica que sea una exportacion valida de WhatsApp.' });
            }
            const participants = [...new Set(messages.filter(m => !m.isSystem).map(m => m.participant))];
            const dates = messages.filter(m => !m.isSystem).map(m => m.date).sort((a, b) => a.getTime() - b.getTime());
            const id = (0, uuid_1.v4)();
            const fileHash = (0, hash_1.sha256)(content);
            const auth = req.user;
            const conversationData = {
                id,
                fileName: req.file.originalname,
                messages,
                participants,
                startDate: dates[0],
                endDate: dates[dates.length - 1],
                uploadedAt: new Date(),
            };
            await conversation_store_1.ConversationStore.set(id, conversationData, { userId: auth.userId, fileHash });
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
        }
        catch (error) {
            console.error('Upload error:', error);
            const msg = error instanceof Error ? error.message : 'Error al procesar el archivo';
            res.status(500).json({ success: false, error: msg });
        }
    });
});
// --- Conversation data helpers ---
async function getConvData(req, res) {
    const id = req.params.id;
    const data = await conversation_store_1.ConversationStore.get(id);
    if (!data) {
        res.status(404).json({ error: 'Conversacion no encontrada' });
        return null;
    }
    return data;
}
// --- Stats & Analysis routes (all protected) ---
router.get('/conversation/:id/stats', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const stats = (0, stats_service_1.calculateGeneralStats)(data);
    const participants = (0, stats_service_1.calculateParticipantStats)(data);
    res.json({ stats, participants });
});
router.get('/conversation/:id/participants', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const participants = (0, stats_service_1.calculateParticipantStats)(data);
    res.json(participants);
});
router.get('/conversation/:id/search', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const result = (0, search_service_1.searchMessages)(data, {
        q: req.query.q,
        participant: req.query.participant,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 20,
    });
    res.json(result);
});
router.get('/conversation/:id/wordcloud', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const wordcloud = (0, wordcloud_service_1.generateWordCloud)(data, limit);
    res.json(wordcloud);
});
router.get('/conversation/:id/sentiment', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const sentiment = (0, sentiment_service_1.analyzeSentiment)(data);
    res.json(sentiment);
});
router.get('/conversation/:id/sentiment/messages/:type', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const type = req.params.type;
    if (!['positive', 'negative', 'neutral'].includes(type)) {
        return res.status(400).json({ error: 'Tipo invalido. Use: positive, negative, neutral' });
    }
    const messages = (0, sentiment_service_1.getMessagesBySentiment)(data, type);
    res.json(messages);
});
router.get('/conversation/:id/topics', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const topics = (0, topics_service_1.analyzeTopics)(data);
    res.json(topics);
});
router.get('/conversation/:id/export/:format', auth_1.requireAuth, async (req, res) => {
    const data = await getConvData(req, res);
    if (!data)
        return;
    const format = req.params.format;
    if (format === 'json') {
        const json = (0, export_service_1.exportToJson)(data);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="whatsapp-export-${req.params.id}.json"`);
        res.send(json);
    }
    else if (format === 'csv') {
        const csv = (0, export_service_1.exportToCsv)(data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="whatsapp-export-${req.params.id}.csv"`);
        res.send('\uFEFF' + csv);
    }
    else if (format === 'xlsx') {
        try {
            const buffer = await (0, export_service_1.exportToExcel)(data);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="whatsapp-export-${req.params.id}.xlsx"`);
            res.send(buffer);
        }
        catch {
            res.status(500).json({ error: 'Error al generar Excel' });
        }
    }
    else {
        res.status(400).json({ error: 'Formato no soportado. Use json, csv o xlsx' });
    }
});
router.post('/test/no-mongo', async (req, res) => {
    res.json({ ok: true, body: req.body, hasConnectDB: typeof mongodb_1.connectDB });
});
router.post('/test/end', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
});
exports.default = router;
