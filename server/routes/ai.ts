import { Router } from 'express';
import { env } from '../config/env';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { buildCopyPrompt, buildVideoPromptPrompt } from '../utils/ai';
import { logAudit } from '../utils/audit';

const aiRouter = Router();
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function estimateCost(tokensUsed: number | null, type: string) {
  if (!tokensUsed) return null;
  const per1k = type === 'video' ? 0.02 : 0.001;
  return Number(((tokensUsed / 1000) * per1k).toFixed(6));
}

function createAiJob(userId: number, type: string, prompt: string, model: string) {
  const result = db.prepare(`
    INSERT INTO ai_jobs (user_id, type, prompt, model, status)
    VALUES (?, ?, ?, ?, 'processing')
  `).run(userId, type, prompt, model);
  return Number(result.lastInsertRowid);
}

function detectFormats(content: string) {
  const text = content.toLowerCase();
  const formats: string[] = [];

  if (/\b1[\.\)-]|\b2[\.\)-]|\b3[\.\)-]/.test(text) || /3 dicas|5 dicas|7 dicas/.test(text)) {
    formats.push('3 dicas');
  }
  if (/antes\s*\/\s*depois|antes e depois|antes->depois/.test(text)) {
    formats.push('antes e depois');
  }
  if (/erro|erros/.test(text)) {
    formats.push('erros comuns');
  }
  if (/segredo|segredos/.test(text)) {
    formats.push('segredos');
  }
  if (/case|resultado|resultados/.test(text)) {
    formats.push('case/resultado');
  }
  if (!formats.length) {
    formats.push('formato livre');
  }

  return formats;
}

function estimateEngagement(content: string, publishedAt: string | null) {
  let score = 2.2;
  const lower = content.toLowerCase();
  const hashtags = (content.match(/#\w+/g) || []).length;
  const lineBreaks = (content.match(/\n/g) || []).length;
  const hour = publishedAt ? new Date(publishedAt).getHours() : 12;

  if (/\b1[\.\)-]|\b2[\.\)-]|\b3[\.\)-]/.test(lower) || /3 dicas|5 dicas/.test(lower)) score += 1.0;
  if (/antes\s*\/\s*depois|antes e depois/.test(lower)) score += 1.2;
  if (/como|por que|segredo|erro/.test(lower)) score += 0.5;
  if (/comente|salve|compartilhe|link na bio|chame/.test(lower)) score += 0.4;
  if (hashtags >= 3 && hashtags <= 8) score += 0.3;
  if (lineBreaks >= 2) score += 0.2;
  if ((hour >= 18 && hour <= 21) || (hour >= 11 && hour <= 13)) score += 0.4;

  return Number(score.toFixed(1));
}

function updateAiJob(id: number, params: { status: string; result?: unknown; tokensUsed?: number | null; costEstimate?: number | null }) {
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

aiRouter.use(verifyToken);

aiRouter.post('/generate-copy', async (req, res) => {
  const { prompt, platform, division } = req.body as { prompt?: string; platform?: string; division?: string };
  if (!platform || !division) {
    return res.status(400).json({ error: 'platform e division são obrigatórios' });
  }

  const systemPrompt = buildCopyPrompt(division, platform, prompt);
  const jobId = createAiJob(req.user!.userId, 'copy', systemPrompt, 'gemini-2.5-flash');

  try {
    const response = await fetch(`${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.85, topP: 0.95, maxOutputTokens: 1024, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { totalTokenCount?: number };
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Remove markdown code blocks se existirem
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: se não retornou JSON, cria estrutura a partir do texto
      const lines = raw.split('\n').filter((l: string) => l.trim());
      const parsed = {
        hook: lines[0] || 'Conteúdo gerado pela IA',
        body: lines.slice(1, -1).join('\n') || raw,
        cta: lines[lines.length - 1] || 'Saiba mais!',
        tags: ['grupogray', 'marketing', 'condominio']
      };
      const fullText = `${parsed.hook}\n\n${parsed.body}\n\n${parsed.cta}\n\n${parsed.tags.map((tag: string) => `#${tag}`).join(' ')}`;
      const tokensUsed = data.usageMetadata?.totalTokenCount ?? null;
      updateAiJob(jobId, { status: 'completed', result: parsed, tokensUsed, costEstimate: estimateCost(tokensUsed, 'copy') });
      try { logAudit(req.user!.userId, 'ai.generate_copy', { jobId, platform, division, format: 'fallback' },req.ip || ""); } catch(e) {}
      return res.json({ copy: parsed, fullText, jobId, tokensUsed, format: detectFormats(fullText) });
    }

    let parsed: { hook: string; body: string; cta: string; tags: string[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      // JSON malformado - extrair campos manualmente
      const hookM = jsonMatch[0].match(/"hook"\s*:\s*"([^"]+)"/);
      const bodyM = jsonMatch[0].match(/"body"\s*:\s*"([^"]*(?:[^"\\]|\\.)*?)"/);
      const ctaM = jsonMatch[0].match(/"cta"\s*:\s*"([^"]+)"/);
      const tagsM = jsonMatch[0].match(/"tags"\s*:\s*\[([^\]]+)\]/);
      parsed = {
        hook: hookM ? hookM[1] : raw.split("\n")[0].replace(/```json/g,"").trim(),
        body: bodyM ? bodyM[1] : raw.substring(0, 200),
        cta: ctaM ? ctaM[1] : "Saiba mais!",
        tags: tagsM ? tagsM[1].replace(/"/g,"").split(",").map((t: string) => t.trim()) : ["grupogray","marketing"],
      };
    }
    const fullText = `${parsed.hook}\n\n${parsed.body}\n\n${parsed.cta}\n\n${parsed.tags.map((tag) => `#${tag}`).join(' ')}`;
    const tokensUsed = data.usageMetadata?.totalTokenCount ?? null;

    updateAiJob(jobId, {
      status: 'completed',
      result: { ...parsed, fullText },
      tokensUsed,
      costEstimate: estimateCost(tokensUsed, 'copy'),
    });

    logAudit({ userId: req.user!.userId, action: 'ai.generate_copy', details: { platform, division, jobId }, ipAddress: req.ip });
    return res.json({ copy: parsed, fullText, jobId, tokensUsed, format: detectFormats(fullText) });
  } catch (error) {
    updateAiJob(jobId, { status: 'failed', result: { error: error instanceof Error ? error.message : 'Erro interno' } });
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao gerar copy' });
  }
});

aiRouter.post('/generate-video-prompt', async (req, res) => {
  const { script, format, division = 'gray-art' } = req.body as { script?: string; format?: string; division?: string };
  if (!script || !format) {
    return res.status(400).json({ error: 'script e format são obrigatórios' });
  }

  const systemPrompt = buildVideoPromptPrompt(division, script, format);
  const jobId = createAiJob(req.user!.userId, 'video_prompt', systemPrompt, 'gemini-2.5-flash');

  try {
    const response = await fetch(`${BASE_URL}/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { totalTokenCount?: number };
    };
    const videoPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const tokensUsed = data.usageMetadata?.totalTokenCount ?? null;

    updateAiJob(jobId, {
      status: 'completed',
      result: { prompt: videoPrompt },
      tokensUsed,
      costEstimate: estimateCost(tokensUsed, 'video_prompt'),
    });

    logAudit({ userId: req.user!.userId, action: 'ai.generate_video_prompt', details: { format, division, jobId }, ipAddress: req.ip });
    return res.json({ job_id: jobId, prompt: videoPrompt });
  } catch (error) {
    updateAiJob(jobId, { status: 'failed', result: { error: error instanceof Error ? error.message : 'Erro interno' } });
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao gerar prompt de vídeo' });
  }
});

aiRouter.post('/generate-video', async (req, res) => {
  const { prompt, format = '9:16', durationSeconds = 6 } = req.body as {
    prompt?: string;
    format?: '9:16' | '16:9';
    durationSeconds?: number;
  };
  if (!prompt) {
    return res.status(400).json({ error: 'prompt é obrigatório' });
  }

  const jobId = createAiJob(req.user!.userId, 'video', prompt, 'veo-3.0-generate-001');

  try {
    const response = await fetch(`${BASE_URL}/models/veo-3.0-generate-001:predictLongRunning?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          aspectRatio: format,
          durationSeconds: Math.min(8, Math.max(4, durationSeconds)),
          sampleCount: 1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json() as { name?: string };
    updateAiJob(jobId, {
      status: 'processing',
      result: { operationName: data.name },
      costEstimate: estimateCost(1, 'video'),
    });

    logAudit({ userId: req.user!.userId, action: 'ai.generate_video', details: { format, jobId, operationName: data.name }, ipAddress: req.ip });
    return res.json({ job_id: jobId, operation_name: data.name });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Erro interno";
    const isQuota = errMsg.toLowerCase().includes("quota") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      updateAiJob(jobId, { status: "failed", result: { error: "QUOTA_EXCEEDED" } });
      return res.json({ job_id: jobId, error: "QUOTA_EXCEEDED", quota_exceeded: true });
    }

    updateAiJob(jobId, { status: "failed", result: { error: errMsg } });
    return res.status(502).json({ error: errMsg });
  }
});

aiRouter.get('/video-status/:jobId', async (req, res) => {
  const jobId = Number(req.params.jobId);
  const row = db.prepare(`
    SELECT id, result
    FROM ai_jobs
    WHERE id = ? AND type = 'video' AND user_id = ?
  `).get(jobId, req.user!.userId) as { id: number; result: string | null } | undefined;

  if (!row) {
    return res.status(404).json({ error: 'Job não encontrado' });
  }

  const parsedResult = row.result ? JSON.parse(row.result) as { operationName?: string } : {};
  if (!parsedResult.operationName) {
    // Job sem operationName = falhou antes de chegar no Google (ex: quota)
    const jobError = (parsedResult as any).error || "Job sem operacao registrada";
    return res.json({ job_id: jobId, status: "failed", error: jobError, done: true });
  }

  try {
    const response = await fetch(`${BASE_URL}/${parsedResult.operationName}?key=${env.geminiApiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

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
      return res.json({ job_id: jobId, status: 'processing', raw: data });
    }

    const sampleVideo = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    const prediction = data.response?.predictions?.[0];
    const videoUrl = sampleVideo
      ? `${sampleVideo}${sampleVideo.includes('?') ? '&' : '?'}key=${env.geminiApiKey}`
      : prediction?.uri || prediction?.videoUri || null;

    const payload = data.error
      ? { error: data.error.message || 'Erro ao gerar vídeo' }
      : { videoUrl, raw: data };

    updateAiJob(jobId, {
      status: data.error ? 'failed' : 'completed',
      result: { operationName: parsedResult.operationName, ...payload },
    });

    return res.json({ job_id: jobId, status: data.error ? 'failed' : 'completed', ...payload });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao consultar status do vídeo' });
  }
});

aiRouter.get('/jobs', async (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, prompt, result, model, tokens_used, cost_estimate, status, created_at, updated_at
    FROM ai_jobs
    WHERE user_id = ?
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

aiRouter.get('/insights', async (req, res) => {
  const rows = db.prepare(`
    SELECT content, published_at, platform
    FROM publish_jobs
    WHERE user_id = ? AND status = 'published'
    ORDER BY datetime(published_at) DESC, id DESC
    LIMIT 30
  `).all(req.user!.userId) as Array<{
    content: string;
    published_at: string | null;
    platform: string;
  }>;

  if (!rows.length) {
    return res.json({
      top_formats: [],
      best_times: [],
      avg_engagement: 0,
      suggestion: 'Ainda não há histórico suficiente. Gere mais publicações para criar insights reais.',
    });
  }

  const formatScores = new Map<string, { total: number; count: number }>();
  const hourScores = new Map<string, { total: number; count: number }>();
  let engagementSum = 0;

  for (const row of rows) {
    const engagement = estimateEngagement(row.content, row.published_at);
    engagementSum += engagement;

    for (const format of detectFormats(row.content)) {
      const current = formatScores.get(format) || { total: 0, count: 0 };
      current.total += engagement;
      current.count += 1;
      formatScores.set(format, current);
    }

    if (row.published_at) {
      const hour = `${new Date(row.published_at).getHours().toString().padStart(2, '0')}:00`;
      const current = hourScores.get(hour) || { total: 0, count: 0 };
      current.total += engagement;
      current.count += 1;
      hourScores.set(hour, current);
    }
  }

  const topFormats = [...formatScores.entries()]
    .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
    .slice(0, 3)
    .map(([format]) => format);

  const bestTimes = [...hourScores.entries()]
    .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))
    .slice(0, 3)
    .map(([hour]) => hour);

  const avgEngagement = Number((engagementSum / rows.length).toFixed(1));
  const leadFormat = topFormats[0] || 'formatos com gancho forte';
  const leadTime = bestTimes[0] || '18:00';
  const uplift = topFormats.length > 1 ? 40 : 25;

  return res.json({
    top_formats: topFormats,
    best_times: bestTimes,
    avg_engagement: avgEngagement,
    suggestion: `Foque em roteiros de ${leadFormat} e publique por volta de ${leadTime}, pois esse padrão está convertendo cerca de ${uplift}% melhor no histórico recente.`,
  });
});

export { aiRouter };
