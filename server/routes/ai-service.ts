import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const aiServiceRouter = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:3066';

aiServiceRouter.use(verifyToken);

// ── TTS Kokoro ──────────────────────────────────────────────────────────────

aiServiceRouter.post('/tts', async (req, res) => {
  const { text, voice = 'af_heart', speed = 1.0 } = req.body as {
    text?: string;
    voice?: string;
    speed?: number;
  };

  if (!text?.trim()) {
    return res.status(400).json({ error: 'texto é obrigatório' });
  }

  try {
    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('voice', voice);
    formData.append('speed', String(speed));

    const response = await fetch(`${AI_SERVICE_URL}/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error((err as { detail?: string }).detail || `HTTP ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const duration = response.headers.get('X-Audio-Duration');

    logAudit({
      userId: req.user!.userId,
      action: 'ai.tts_generate',
      details: { voice, textLength: text.length, duration },
      ipAddress: req.ip,
    });

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': String(audioBuffer.length),
      'X-Audio-Duration': duration || '0',
    });
    return res.send(audioBuffer);
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Erro ao gerar narração',
    });
  }
});

aiServiceRouter.get('/tts/voices', async (_req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/tts/voices`);
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.json({
      voices: [
        { id: 'af_heart', name: 'Heart (feminina)', lang: 'pt-BR' },
        { id: 'am_adam', name: 'Adam (masculina)', lang: 'pt-BR' },
      ],
      default: 'af_heart',
    });
  }
});

// ── Photo Analysis (MoonDream + Gemini) ─────────────────────────────────────

aiServiceRouter.post('/analyze-photo', async (req, res) => {
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Envie a imagem como multipart/form-data' });
  }

  try {
    // Repassa o request inteiro para o serviço Python
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    const response = await fetch(`${AI_SERVICE_URL}/photo/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.length),
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data as { detail?: string }).detail || `HTTP ${response.status}`);
    }

    logAudit({
      userId: req.user!.userId,
      action: 'ai.analyze_photo',
      details: { score: (data as { report?: { score?: number } }).report?.score },
      ipAddress: req.ip,
    });

    return res.json(data);
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Erro na análise de foto',
    });
  }
});

// ── Health do serviço Python ────────────────────────────────────────────────

aiServiceRouter.get('/service-health', async (_req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.json({ ok: false, service: 'grayart-ai', error: 'serviço offline' });
  }
});

export { aiServiceRouter };
