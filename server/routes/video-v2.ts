import { Router } from 'express';
import { env } from '../config/env';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const videoV2Router = Router();
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const PIAPI_BASE = 'https://api.piapi.ai/api/v1/task';

type VideoFormat = '9:16' | '16:9' | '1:1';
type VideoDuration = 5 | 8;
type VideoProvider = 'veo' | 'kling' | 'auto';

function ensureUser(userId: number) {
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!exists) {
    db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(
      userId, `auto-${userId}@grayart.local`, 'auto', 'GrayArt User', 'user'
    );
  }
}

function createJob(userId: number, prompt: string, model: string) {
  ensureUser(userId);
  const result = db.prepare(`
    INSERT INTO ai_jobs (user_id, type, prompt, model, status)
    VALUES (?, 'video_v2', ?, ?, 'processing')
  `).run(userId, prompt, model);
  return Number(result.lastInsertRowid);
}

function updateJob(id: number, params: { status: string; result?: unknown; tokensUsed?: number | null; costEstimate?: number | null }) {
  db.prepare(`
    UPDATE ai_jobs
    SET status = ?, result = ?, tokens_used = ?, cost_estimate = ?, updated_at = ?
    WHERE id = ?
  `).run(
    params.status,
    params.result ? JSON.stringify(params.result) : null,
    params.tokensUsed ?? null,
    params.costEstimate ?? null,
    nowIso(),
    id,
  );
}

function isQuotaError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
}

function piApiHeaders() {
  return {
    'X-API-Key': process.env.PIAPI_KEY || '',
    'Content-Type': 'application/json',
  };
}

videoV2Router.use(verifyToken);

// POST /generate
videoV2Router.post('/generate', async (req, res) => {
  const { prompt, format = '9:16', duration = 5, provider = 'auto' } = req.body as {
    prompt?: string;
    format?: VideoFormat;
    duration?: VideoDuration;
    provider?: VideoProvider;
  };

  if (!prompt) {
    return res.status(400).json({ error: 'prompt e obrigatorio' });
  }

  const userId = req.user!.userId;
  let usedProvider: 'veo' | 'kling' | null = null;
  let jobId: number | null = null;

  // Try Veo 3.1
  if (provider === 'auto' || provider === 'veo') {
    jobId = createJob(userId, prompt, 'veo-3.1');
    try {
      const response = await fetch(
        `${GEMINI_BASE}/models/veo-3.0-generate-001:predictLongRunning?key=${env.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              aspectRatio: format,
              durationSeconds: Math.min(8, Math.max(4, Math.ceil(duration / 2) * 2)),
              sampleCount: 1,
            },
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = (err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json() as { name?: string };
      updateJob(jobId, {
        status: 'processing',
        result: { operationName: data.name, provider: 'veo' },
      });

      usedProvider = 'veo';
      logAudit({ userId, action: 'video_v2.generate', details: { jobId, provider: 'veo', format }, ipAddress: req.ip });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro interno';
      if (isQuotaError(errMsg) && provider === 'auto') {
        updateJob(jobId, { status: 'failed', result: { error: 'QUOTA_EXCEEDED', provider: 'veo' } });
        jobId = null; // will create new job for kling
      } else {
        updateJob(jobId, { status: 'failed', result: { error: errMsg, provider: 'veo' } });
        return res.status(502).json({ error: errMsg });
      }
    }
  }

  // Try Kling 3.0 (explicit or fallback)
  if (!usedProvider && (provider === 'kling' || provider === 'auto')) {
    jobId = createJob(userId, prompt, 'kling-3.0');
    try {
      const response = await fetch(PIAPI_BASE, {
        method: 'POST',
        headers: piApiHeaders(),
        body: JSON.stringify({
          model: 'kling',
          task_type: 'video_generation',
          input: {
            prompt,
            aspect_ratio: format,
            duration: 5,
            mode: 'std',
          },
        }),
      });

      const data = await response.json() as { code?: number; data?: { task_id?: string }; message?: string };
      if (data.code !== 200 || !data.data?.task_id) {
        throw new Error(data.message || `Kling erro: ${JSON.stringify(data)}`);
      }

      const taskId = data.data.task_id;

      updateJob(jobId, {
        status: 'processing',
        result: { task_id: taskId, provider: 'kling' },
      });

      usedProvider = 'kling';
      logAudit({ userId, action: 'video_v2.generate', details: { jobId, provider: 'kling', format, fallback: provider === 'auto' }, ipAddress: req.ip });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro interno';
      updateJob(jobId!, { status: 'failed', result: { error: errMsg, provider: 'kling' } });
      return res.status(502).json({ error: errMsg });
    }
  }

  if (!usedProvider || !jobId) {
    return res.status(500).json({ error: 'Nenhum provider disponivel' });
  }

  return res.json({ job_id: jobId, provider: usedProvider, status: 'processing' });
});

// GET /status/:jobId
videoV2Router.get('/status/:jobId', async (req, res) => {
  const jobId = Number(req.params.jobId);
  const row = db.prepare(`
    SELECT id, model, result, status
    FROM ai_jobs
    WHERE id = ? AND type = 'video_v2' AND user_id = ?
  `).get(jobId, req.user!.userId) as { id: number; model: string; result: string | null; status: string } | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Job nao encontrado' });
  }

  const parsed = row.result ? JSON.parse(row.result) as Record<string, unknown> : {};

  if (row.status === 'completed' || row.status === 'failed') {
    return res.json({
      job_id: jobId,
      status: row.status,
      provider: row.model === 'veo-3.1' ? 'veo' : 'kling',
      videoUrl: (parsed as any).videoUrl || null,
      error: (parsed as any).error || null,
      done: true,
    });
  }

  // Poll Veo 3.1
  if (row.model === 'veo-3.1') {
    const operationName = parsed.operationName as string | undefined;
    if (!operationName) {
      return res.json({ job_id: jobId, status: 'failed', provider: 'veo', error: 'Job sem operacao registrada', done: true });
    }

    try {
      const response = await fetch(`${GEMINI_BASE}/${operationName}?key=${env.geminiApiKey}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as {
        done?: boolean;
        response?: {
          generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> };
          predictions?: Array<{ uri?: string; videoUri?: string }>;
        };
        error?: { message?: string };
      };

      if (!data.done) {
        return res.json({ job_id: jobId, status: 'processing', provider: 'veo', done: false });
      }

      if (data.error) {
        updateJob(jobId, { status: 'failed', result: { ...parsed, error: data.error.message } });
        logAudit({ userId: req.user!.userId, action: 'video_v2.failed', details: { jobId, provider: 'veo', error: data.error.message }, ipAddress: req.ip });
        return res.json({ job_id: jobId, status: 'failed', provider: 'veo', error: data.error.message, done: true });
      }

      const sampleVideo = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      const prediction = data.response?.predictions?.[0];
      const videoUrl = sampleVideo
        ? `${sampleVideo}${sampleVideo.includes('?') ? '&' : '?'}key=${env.geminiApiKey}`
        : prediction?.uri || prediction?.videoUri || null;

      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'veo' }, ipAddress: req.ip });
      return res.json({ job_id: jobId, status: 'completed', provider: 'veo', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Veo' });
    }
  }

  // Poll Kling 3.0
  if (row.model === 'kling-3.0') {
    const taskId = parsed.task_id as string | undefined;
    if (!taskId) {
      return res.json({ job_id: jobId, status: 'failed', provider: 'kling', error: 'Job sem task_id registrado', done: true });
    }

    try {
      const response = await fetch(`${PIAPI_BASE}/${taskId}`, {
        headers: piApiHeaders(),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as { code?: number; data?: any };
      const klingStatus = data.data?.status || 'processing';

      if (klingStatus === 'pending' || klingStatus === 'processing') {
        return res.json({ job_id: jobId, status: 'processing', provider: 'kling', done: false });
      }

      if (klingStatus === 'failed') {
        const errMsg = data.data?.error?.message || 'Kling generation failed';
        updateJob(jobId, { status: 'failed', result: { ...parsed, error: errMsg } });
        logAudit({ userId: req.user!.userId, action: 'video_v2.failed', details: { jobId, provider: 'kling' }, ipAddress: req.ip });
        return res.json({ job_id: jobId, status: 'failed', provider: 'kling', error: errMsg, done: true });
      }

      // Kling retorna video em output.works[0].video.resource
      const works = data.data?.output?.works || [];
      const videoUrl = works[0]?.video?.resource
        || works[0]?.video?.resource_without_watermark
        || works[0]?.video?.url
        || null;
      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'kling' }, ipAddress: req.ip });
      return res.json({ job_id: jobId, status: 'completed', provider: 'kling', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Kling' });
    }
  }

  return res.json({ job_id: jobId, status: row.status, provider: 'unknown', done: false });
});

// GET /history
videoV2Router.get('/history', async (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, prompt, result, model, tokens_used, cost_estimate, status, created_at, updated_at
    FROM ai_jobs
    WHERE user_id = ? AND type IN ('video', 'video_v2')
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 50
  `).all(req.user!.userId) as Array<{
    id: number;
    type: string;
    prompt: string;
    result: string | null;
    model: string;
    tokens_used: number | null;
    cost_estimate: number | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>;

  return res.json({
    jobs: rows.map((row) => ({
      ...row,
      result: row.result ? JSON.parse(row.result) : null,
    })),
  });
});

export { videoV2Router };
