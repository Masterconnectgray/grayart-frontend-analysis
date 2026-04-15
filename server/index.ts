import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cron from 'node-cron';
import { automationRouter } from './routes/automation';
import { env } from './config/env';
import './database';
import { aiRouter } from './routes/ai';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { flowRouter } from './routes/flow';
import { socialRouter } from './routes/social';
import { whatsappRouter } from './routes/whatsapp';
import { mediaRouter } from './routes/media';
import { agentsHubRouter } from './routes/agents-hub';
import { aiServiceRouter } from './routes/ai-service';
import { videoV2Router } from './routes/video-v2';
import { videoComposerRouter } from './routes/video-composer';
import { processScheduledPosts } from './utils/scheduler';
import { verifyToken } from './middleware/auth';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://flowgray.com.br',
  'https://www.flowgray.com.br',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin não permitido pelo CORS'));
  },
  credentials: true,
}));

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de geracoes IA atingido. Aguarde 1 minuto.' },
});

app.use('/api/ai/generate-copy', aiRateLimit);
app.use('/api/ai/generate-video', aiRateLimit);
app.use('/api/video-v2/generate', aiRateLimit);
app.use('/api/video-composer/compose', aiRateLimit);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'grayart-bff', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/ai', verifyToken, aiRouter);
app.use('/api/automation', verifyToken, automationRouter);
app.use('/api/dashboard', verifyToken, dashboardRouter);
app.use('/api/flow', verifyToken, flowRouter);
app.use('/api/social', verifyToken, socialRouter);
app.use('/api/whatsapp', verifyToken, whatsappRouter);
app.use('/api/media', verifyToken, mediaRouter);
app.use('/api/agents-hub', verifyToken, agentsHubRouter);
app.use('/api/ai-service', verifyToken, aiServiceRouter);
app.use('/api/video-v2', verifyToken, videoV2Router);
app.use('/api/video-composer', verifyToken, videoComposerRouter);

app.use((error: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  void next;
  res.status(500).json({ error: error.message || 'Erro interno do servidor' });
});

cron.schedule('* * * * *', async () => {
  try {
    await processScheduledPosts();
  } catch (error) {
    console.error('Erro ao processar agendamentos:', error);
  }
});

app.listen(env.port, () => {
  console.log(`GrayArt BFF rodando em http://localhost:${env.port}`);
});
