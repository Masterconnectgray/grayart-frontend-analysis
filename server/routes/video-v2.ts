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
type VideoProvider = 'veo' | 'kling' | 'seedance' | 'luma' | 'wan' | 'hunyuan' | 'auto';

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
  return lower.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || lower.includes('credit') || lower.includes('not enough');
}

// Cache de quota — evita tentativas repetidas quando ja sabe que esgotou
const quotaCache: Record<string, number> = {};
const QUOTA_COOLDOWN = 10 * 60 * 1000; // 10 minutos

function isProviderCoolingDown(provider: string): boolean {
  const lastFail = quotaCache[provider];
  if (!lastFail) return false;
  return Date.now() - lastFail < QUOTA_COOLDOWN;
}

function markProviderQuotaFail(provider: string) {
  quotaCache[provider] = Date.now();
}

function piApiHeaders() {
  return {
    'X-API-Key': process.env.PIAPI_KEY || '',
    'Content-Type': 'application/json',
  };
}

async function sendWhatsAppNotification(message: string) {
  try {
    const instances = await fetch(`${process.env.EVOLUTION_API_URL || 'http://localhost:8080'}/instance/fetchInstances`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY || '' },
    }).then(r => r.json()) as any[];

    const openInstance = instances.find((i: any) => i.instance?.status === 'open');
    if (!openInstance) return;

    const instanceName = openInstance.instance.instanceName;
    const owner = openInstance.instance.owner;
    if (!owner) return;

    await fetch(`${process.env.EVOLUTION_API_URL || 'http://localhost:8080'}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        apikey: process.env.EVOLUTION_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: owner, text: message }),
    });
  } catch {
    // Silent — notification is best-effort
  }
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
  let usedProvider: 'veo' | 'kling' | 'seedance' | 'luma' | 'wan' | 'hunyuan' | null = null;
  let jobId: number | null = null;

  // Try Veo 3.1 (skip if quota recently failed)
  if ((provider === 'auto' || provider === 'veo') && !isProviderCoolingDown('veo')) {
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
        markProviderQuotaFail('veo');
        updateJob(jobId, { status: 'failed', result: { error: 'QUOTA_EXCEEDED', provider: 'veo' } });
        jobId = null; // will create new job for kling
      } else {
        updateJob(jobId, { status: 'failed', result: { error: errMsg, provider: 'veo' } });
        return res.status(502).json({ error: errMsg });
      }
    }
  }

  // Try Kling 3.0 (explicit or fallback)
  if (!usedProvider && (provider === 'kling' || provider === 'auto') && !isProviderCoolingDown('kling')) {
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
      if (isQuotaError(errMsg) && provider === 'auto') {
        markProviderQuotaFail('kling');
        updateJob(jobId!, { status: 'failed', result: { error: 'QUOTA_EXCEEDED', provider: 'kling' } });
        jobId = null; // will create new job for seedance
      } else {
        updateJob(jobId!, { status: 'failed', result: { error: errMsg, provider: 'kling' } });
        return res.status(502).json({ error: errMsg });
      }
    }
  }

  // Try Seedance 2.0 (explicit or fallback)
  if (!usedProvider && (provider === 'seedance' || provider === 'auto') && !isProviderCoolingDown('seedance')) {
    jobId = createJob(userId, prompt, 'seedance-2.0');
    try {
      const response = await fetch(PIAPI_BASE, {
        method: 'POST',
        headers: piApiHeaders(),
        body: JSON.stringify({
          model: 'seedance',
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
        throw new Error(data.message || `Seedance erro: ${JSON.stringify(data)}`);
      }

      const taskId = data.data.task_id;

      updateJob(jobId, {
        status: 'processing',
        result: { task_id: taskId, provider: 'seedance' },
      });

      usedProvider = 'seedance';
      logAudit({ userId, action: 'video_v2.generate', details: { jobId, provider: 'seedance', format, fallback: provider === 'auto' }, ipAddress: req.ip });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro interno';
      if (isQuotaError(errMsg) && provider === 'auto') {
        markProviderQuotaFail('seedance');
        updateJob(jobId!, { status: 'failed', result: { error: 'QUOTA_EXCEEDED', provider: 'seedance' } });
        jobId = null;
      } else {
        updateJob(jobId!, { status: 'failed', result: { error: errMsg, provider: 'seedance' } });
        return res.status(502).json({ error: errMsg });
      }
    }
  }

  // Try Luma Dream Machine (explicit or fallback)
  if (!usedProvider && (provider === 'luma' || provider === 'auto') && !isProviderCoolingDown('luma')) {
    jobId = createJob(userId, prompt, 'luma-dream');
    try {
      const response = await fetch(PIAPI_BASE, {
        method: 'POST',
        headers: piApiHeaders(),
        body: JSON.stringify({
          model: 'luma',
          task_type: 'video_generation',
          input: {
            prompt,
            aspect_ratio: format,
            duration: 5,
          },
        }),
      });

      const data = await response.json() as { code?: number; data?: { task_id?: string }; message?: string };
      if (data.code !== 200 || !data.data?.task_id) {
        throw new Error(data.message || `Luma erro: ${JSON.stringify(data)}`);
      }

      updateJob(jobId, {
        status: 'processing',
        result: { task_id: data.data.task_id, provider: 'luma' },
      });

      usedProvider = 'luma';
      logAudit({ userId, action: 'video_v2.generate', details: { jobId, provider: 'luma', format, fallback: provider === 'auto' }, ipAddress: req.ip });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro interno';
      if (isQuotaError(errMsg) && provider === 'auto') {
        markProviderQuotaFail('luma');
        updateJob(jobId!, { status: 'failed', result: { error: 'QUOTA_EXCEEDED', provider: 'luma' } });
        jobId = null;
      } else {
        updateJob(jobId!, { status: 'failed', result: { error: errMsg, provider: 'luma' } });
        return res.status(502).json({ error: errMsg });
      }
    }
  }

  // Try Wan 2.1 (explicit or fallback)
  if (!usedProvider && (provider === 'wan' || provider === 'auto') && !isProviderCoolingDown('wan')) {
    jobId = createJob(userId, prompt, 'wan-2.1');
    try {
      const response = await fetch(PIAPI_BASE, {
        method: 'POST',
        headers: piApiHeaders(),
        body: JSON.stringify({
          model: 'wan',
          task_type: 'video_generation',
          input: {
            prompt,
            aspect_ratio: format,
            duration: 5,
          },
        }),
      });

      const data = await response.json() as { code?: number; data?: { task_id?: string }; message?: string };
      if (data.code !== 200 || !data.data?.task_id) {
        throw new Error(data.message || `Wan erro: ${JSON.stringify(data)}`);
      }

      updateJob(jobId, {
        status: 'processing',
        result: { task_id: data.data.task_id, provider: 'wan' },
      });

      usedProvider = 'wan';
      logAudit({ userId, action: 'video_v2.generate', details: { jobId, provider: 'wan', format, fallback: provider === 'auto' }, ipAddress: req.ip });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro interno';
      if (isQuotaError(errMsg) && provider === 'auto') {
        markProviderQuotaFail('wan');
        updateJob(jobId!, { status: 'failed', result: { error: 'QUOTA_EXCEEDED', provider: 'wan' } });
        jobId = null;
      } else {
        updateJob(jobId!, { status: 'failed', result: { error: errMsg, provider: 'wan' } });
        return res.status(502).json({ error: errMsg });
      }
    }
  }

  // Try Hunyuan Video (explicit or fallback)
  if (!usedProvider && (provider === 'hunyuan' || provider === 'auto') && !isProviderCoolingDown('hunyuan')) {
    jobId = createJob(userId, prompt, 'hunyuan-video');
    try {
      const response = await fetch(PIAPI_BASE, {
        method: 'POST',
        headers: piApiHeaders(),
        body: JSON.stringify({
          model: 'hunyuan',
          task_type: 'video_generation',
          input: {
            prompt,
            aspect_ratio: format,
            duration: 5,
          },
        }),
      });

      const data = await response.json() as { code?: number; data?: { task_id?: string }; message?: string };
      if (data.code !== 200 || !data.data?.task_id) {
        throw new Error(data.message || `Hunyuan erro: ${JSON.stringify(data)}`);
      }

      updateJob(jobId, {
        status: 'processing',
        result: { task_id: data.data.task_id, provider: 'hunyuan' },
      });

      usedProvider = 'hunyuan';
      logAudit({ userId, action: 'video_v2.generate', details: { jobId, provider: 'hunyuan', format, fallback: provider === 'auto' }, ipAddress: req.ip });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro interno';
      updateJob(jobId!, { status: 'failed', result: { error: errMsg, provider: 'hunyuan' } });
      return res.status(502).json({ error: errMsg });
    }
  }

  if (!usedProvider || !jobId) {
    const coolingDown = ['veo', 'kling', 'seedance', 'luma', 'wan', 'hunyuan'].filter(p => isProviderCoolingDown(p));
    const msg = coolingDown.length > 0
      ? `Quotas esgotadas (${coolingDown.join(', ')}). Aguarde 10min ou tente outro provider.`
      : 'Nenhum provider disponivel';
    return res.status(429).json({ error: msg });
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
      provider: row.model === 'veo-3.1' ? 'veo' : row.model === 'seedance-2.0' ? 'seedance' : row.model === 'luma-dream' ? 'luma' : row.model === 'wan-2.1' ? 'wan' : row.model === 'hunyuan-video' ? 'hunyuan' : 'kling',
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
        sendWhatsAppNotification(`Video IA falhou (Veo). Erro: ${data.error.message}`);
        return res.json({ job_id: jobId, status: 'failed', provider: 'veo', error: data.error.message, done: true });
      }

      const sampleVideo = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      const prediction = data.response?.predictions?.[0];
      const videoUrl = sampleVideo
        ? `${sampleVideo}${sampleVideo.includes('?') ? '&' : '?'}key=${env.geminiApiKey}`
        : prediction?.uri || prediction?.videoUri || null;

      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'veo' }, ipAddress: req.ip });
      sendWhatsAppNotification(`Video IA pronto! Gerado com veo. Acesse o GrayArt para ver e baixar.`);
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
        sendWhatsAppNotification(`Video IA falhou (Kling). Erro: ${errMsg}`);
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
      sendWhatsAppNotification(`Video IA pronto! Gerado com kling. Acesse o GrayArt para ver e baixar.`);
      return res.json({ job_id: jobId, status: 'completed', provider: 'kling', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Kling' });
    }
  }

  // Poll Seedance 2.0
  if (row.model === 'seedance-2.0') {
    const taskId = parsed.task_id as string | undefined;
    if (!taskId) {
      return res.json({ job_id: jobId, status: 'failed', provider: 'seedance', error: 'Job sem task_id registrado', done: true });
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
      const seedStatus = data.data?.status || 'processing';

      if (seedStatus === 'pending' || seedStatus === 'processing') {
        return res.json({ job_id: jobId, status: 'processing', provider: 'seedance', done: false });
      }

      if (seedStatus === 'failed') {
        const errMsg = data.data?.error?.message || 'Seedance generation failed';
        updateJob(jobId, { status: 'failed', result: { ...parsed, error: errMsg } });
        logAudit({ userId: req.user!.userId, action: 'video_v2.failed', details: { jobId, provider: 'seedance' }, ipAddress: req.ip });
        sendWhatsAppNotification(`Video IA falhou (Seedance). Erro: ${errMsg}`);
        return res.json({ job_id: jobId, status: 'failed', provider: 'seedance', error: errMsg, done: true });
      }

      const works = data.data?.output?.works || [];
      const videoUrl = works[0]?.video?.resource
        || works[0]?.video?.resource_without_watermark
        || works[0]?.video?.url
        || null;
      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'seedance' }, ipAddress: req.ip });
      sendWhatsAppNotification(`Video IA pronto! Gerado com seedance. Acesse o GrayArt para ver e baixar.`);
      return res.json({ job_id: jobId, status: 'completed', provider: 'seedance', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Seedance' });
    }
  }

  // Poll Luma Dream Machine
  if (row.model === 'luma-dream') {
    const taskId = parsed.task_id as string | undefined;
    if (!taskId) {
      return res.json({ job_id: jobId, status: 'failed', provider: 'luma', error: 'Job sem task_id registrado', done: true });
    }

    try {
      const response = await fetch(`${PIAPI_BASE}/${taskId}`, { headers: piApiHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as { code?: number; data?: any };
      const lumaStatus = data.data?.status || 'processing';

      if (lumaStatus === 'pending' || lumaStatus === 'processing') {
        return res.json({ job_id: jobId, status: 'processing', provider: 'luma', done: false });
      }
      if (lumaStatus === 'failed') {
        const errMsg = data.data?.error?.message || 'Luma generation failed';
        updateJob(jobId, { status: 'failed', result: { ...parsed, error: errMsg } });
        logAudit({ userId: req.user!.userId, action: 'video_v2.failed', details: { jobId, provider: 'luma' }, ipAddress: req.ip });
        sendWhatsAppNotification(`Video IA falhou (Luma). Erro: ${errMsg}`);
        return res.json({ job_id: jobId, status: 'failed', provider: 'luma', error: errMsg, done: true });
      }

      const works = data.data?.output?.works || [];
      const videoUrl = works[0]?.video?.resource || works[0]?.video?.resource_without_watermark || works[0]?.video?.url || null;
      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'luma' }, ipAddress: req.ip });
      sendWhatsAppNotification(`Video IA pronto! Gerado com luma. Acesse o GrayArt para ver e baixar.`);
      return res.json({ job_id: jobId, status: 'completed', provider: 'luma', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Luma' });
    }
  }

  // Poll Wan 2.1
  if (row.model === 'wan-2.1') {
    const taskId = parsed.task_id as string | undefined;
    if (!taskId) {
      return res.json({ job_id: jobId, status: 'failed', provider: 'wan', error: 'Job sem task_id registrado', done: true });
    }

    try {
      const response = await fetch(`${PIAPI_BASE}/${taskId}`, { headers: piApiHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as { code?: number; data?: any };
      const wanStatus = data.data?.status || 'processing';

      if (wanStatus === 'pending' || wanStatus === 'processing') {
        return res.json({ job_id: jobId, status: 'processing', provider: 'wan', done: false });
      }
      if (wanStatus === 'failed') {
        const errMsg = data.data?.error?.message || 'Wan generation failed';
        updateJob(jobId, { status: 'failed', result: { ...parsed, error: errMsg } });
        logAudit({ userId: req.user!.userId, action: 'video_v2.failed', details: { jobId, provider: 'wan' }, ipAddress: req.ip });
        sendWhatsAppNotification(`Video IA falhou (Wan). Erro: ${errMsg}`);
        return res.json({ job_id: jobId, status: 'failed', provider: 'wan', error: errMsg, done: true });
      }

      const works = data.data?.output?.works || [];
      const videoUrl = works[0]?.video?.resource || works[0]?.video?.resource_without_watermark || works[0]?.video?.url || null;
      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'wan' }, ipAddress: req.ip });
      sendWhatsAppNotification(`Video IA pronto! Gerado com wan. Acesse o GrayArt para ver e baixar.`);
      return res.json({ job_id: jobId, status: 'completed', provider: 'wan', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Wan' });
    }
  }

  // Poll Hunyuan Video
  if (row.model === 'hunyuan-video') {
    const taskId = parsed.task_id as string | undefined;
    if (!taskId) {
      return res.json({ job_id: jobId, status: 'failed', provider: 'hunyuan', error: 'Job sem task_id registrado', done: true });
    }

    try {
      const response = await fetch(`${PIAPI_BASE}/${taskId}`, { headers: piApiHeaders() });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json() as { code?: number; data?: any };
      const hunyuanStatus = data.data?.status || 'processing';

      if (hunyuanStatus === 'pending' || hunyuanStatus === 'processing') {
        return res.json({ job_id: jobId, status: 'processing', provider: 'hunyuan', done: false });
      }
      if (hunyuanStatus === 'failed') {
        const errMsg = data.data?.error?.message || 'Hunyuan generation failed';
        updateJob(jobId, { status: 'failed', result: { ...parsed, error: errMsg } });
        logAudit({ userId: req.user!.userId, action: 'video_v2.failed', details: { jobId, provider: 'hunyuan' }, ipAddress: req.ip });
        sendWhatsAppNotification(`Video IA falhou (Hunyuan). Erro: ${errMsg}`);
        return res.json({ job_id: jobId, status: 'failed', provider: 'hunyuan', error: errMsg, done: true });
      }

      const works = data.data?.output?.works || [];
      const videoUrl = works[0]?.video?.resource || works[0]?.video?.resource_without_watermark || works[0]?.video?.url || null;
      updateJob(jobId, { status: 'completed', result: { ...parsed, videoUrl } });
      logAudit({ userId: req.user!.userId, action: 'video_v2.completed', details: { jobId, provider: 'hunyuan' }, ipAddress: req.ip });
      sendWhatsAppNotification(`Video IA pronto! Gerado com hunyuan. Acesse o GrayArt para ver e baixar.`);
      return res.json({ job_id: jobId, status: 'completed', provider: 'hunyuan', videoUrl, done: true });
    } catch (error) {
      return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status Hunyuan' });
    }
  }

  return res.json({ job_id: jobId, status: row.status, provider: 'unknown', done: false });
});

// GET /history
videoV2Router.get('/history', async (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, prompt, result, model, tokens_used, cost_estimate, status, created_at, updated_at
    FROM ai_jobs
    WHERE user_id = ? AND type IN ('video', 'video_v2', 'video_compose')
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
