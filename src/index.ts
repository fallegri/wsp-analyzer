import express from 'express';
import path from 'path';
import apiRouter from './routes/api';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.static(path.join(process.cwd(), 'public')));
}

app.use('/api', apiRouter);

app.get(/^\/conversation\/([a-f0-9-]+)(\/.*)?$/i, (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
});

app.use((_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`WhatsApp Analyzer corriendo en http://localhost:${PORT}`);
  });
}

export default app;
