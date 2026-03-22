import { Router } from 'express';
import { env } from '../config/env';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const videoComposerRouter = Router();
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const UPLOADS_DIR = path.resolve(process.cwd(), 'server/uploads');

type VideoFormat = '9:16' | '16:9' | '1:1';

interface SceneDesc {
  scene: number;
  prompt: string;
  duration: number;
  status?: string;
  videoUrl?: string;
  operationName?: string;
}

function ensureUser(userId: number) {
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!exists) {
    db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)').run(
      userId, `auto-${userId}@grayart.local`, 'auto', 'GrayArt User', 'user'
    );
  }
}

function createJob(userId: number, prompt: string): number {
  ensureUser(userId);
  const result = db.prepare(`
    INSERT INTO ai_jobs (user_id, type, prompt, model, status)
    VALUES (?, 'video_compose', ?, 'veo-3.0', 'processing')
  `).run(userId, prompt);
  return Number(result.lastInsertRowid);
}

function updateJob(id: number, status: string, result?: unknown, cost?: number | null) {
  db.prepare(`
    UPDATE ai_jobs
    SET status = ?, result = ?, cost_estimate = ?, updated_at = ?
    WHERE id = ?
  `).run(
    status,
    result ? JSON.stringify(result) : null,
    cost ?? null,
    nowIso(),
    id,
  );
}

function getJob(jobId: number, userId: number) {
  return db.prepare(`
    SELECT id, result, status FROM ai_jobs
    WHERE id = ? AND type = 'video_compose' AND user_id = ?
  `).get(jobId, userId) as { id: number; result: string | null; status: string } | undefined;
}

async function callGeminiText(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseSceneJson(raw: string): SceneDesc[] {
  const match = raw.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('Gemini nao retornou JSON valido');
  return JSON.parse(match[0]);
}

async function generateSceneScript(prompt: string, numScenes: number, totalDuration: number): Promise<SceneDesc[]> {
  const geminiPrompt = `Given this concept: ${prompt}. Create exactly ${numScenes} scene descriptions for a ${totalDuration}s video. Each scene is ~6 seconds. Return JSON array: [{"scene": 1, "prompt": "detailed visual description in English for AI video generation, 40-60 words, cinematic, no text overlays", "duration": 6}]. The scenes should tell a cohesive visual story. Return ONLY the JSON array, no markdown.`;
  const raw = await callGeminiText(geminiPrompt);
  return parseSceneJson(raw);
}

async function startVeoGeneration(scenePrompt: string, format: VideoFormat): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/models/veo-3.0-generate-001:predictLongRunning?key=${env.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: scenePrompt }],
        parameters: { aspectRatio: format, durationSeconds: 6, sampleCount: 1 },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error?.message || `Veo HTTP ${res.status}`);
  }
  const data = await res.json() as { name?: string };
  if (!data.name) throw new Error('Veo nao retornou operation name');
  return data.name;
}

async function pollVeoOperation(operationName: string): Promise<string | null> {
  const res = await fetch(`${GEMINI_BASE}/${operationName}?key=${env.geminiApiKey}`);
  if (!res.ok) return null;
  const data = await res.json() as any;
  if (!data.done) return null;
  if (data.error) throw new Error(data.error.message || 'Veo operation failed');
  const uri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    || data.response?.predictions?.[0]?.uri
    || data.response?.predictions?.[0]?.videoUri;
  if (!uri) throw new Error('Veo nao retornou video URI');
  return `${uri}${uri.includes('?') ? '&' : '?'}key=${env.geminiApiKey}`;
}

async function downloadVideo(url: string, filepath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download falhou: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

function stitchVideos(jobId: number, sceneFiles: string[], outputPath: string): void {
  const listPath = path.join(UPLOADS_DIR, `compose_${jobId}_list.txt`);
  const lines = sceneFiles.map((f) => `file '${path.basename(f)}'`).join('\n');
  fs.writeFileSync(listPath, lines);
  execSync(`/usr/bin/ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, {
    timeout: 60000,
    stdio: 'pipe',
  });
  fs.unlinkSync(listPath);
}

function scheduleCleanup(jobId: number, numScenes: number) {
  setTimeout(() => {
    for (let i = 0; i < numScenes; i++) {
      const f = path.join(UPLOADS_DIR, `compose_${jobId}_scene_${i}.mp4`);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    const list = path.join(UPLOADS_DIR, `compose_${jobId}_list.txt`);
    if (fs.existsSync(list)) fs.unlinkSync(list);
  }, 3600_000);
}

async function processScenes(jobId: number, scenes: SceneDesc[], format: VideoFormat, userId: number) {
  const sceneFiles: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    scene.status = 'generating';
    updateJob(jobId, 'processing', { scenes, currentScene: i + 1, totalScenes: scenes.length });

    let retries = 0;
    let success = false;

    while (retries < 2 && !success) {
      try {
        const opName = await startVeoGeneration(scene.prompt, format);
        scene.operationName = opName;

        let videoUrl: string | null = null;
        for (let poll = 0; poll < 120; poll++) {
          await new Promise((r) => setTimeout(r, 5000));
          videoUrl = await pollVeoOperation(opName);
          if (videoUrl) break;
        }

        if (!videoUrl) throw new Error(`Scene ${i + 1} timeout after 10min`);

        const filePath = path.join(UPLOADS_DIR, `compose_${jobId}_scene_${i}.mp4`);
        await downloadVideo(videoUrl, filePath);

        scene.status = 'completed';
        scene.videoUrl = videoUrl;
        sceneFiles.push(filePath);
        success = true;
      } catch (err) {
        retries++;
        if (retries >= 2) {
          scene.status = 'failed';
          scene.videoUrl = undefined;
        }
      }
    }
  }

  const completedScenes = scenes.filter((s) => s.status === 'completed').length;
  const validFiles = sceneFiles.filter((f) => fs.existsSync(f));

  if (validFiles.length === 0) {
    updateJob(jobId, 'failed', { scenes, error: 'Nenhuma cena gerada com sucesso' });
    logAudit({ userId, action: 'video_compose.failed', details: { jobId }, ipAddress: '' });
    return;
  }

  const outputPath = path.join(UPLOADS_DIR, `compose_${jobId}_final.mp4`);

  try {
    if (validFiles.length === 1) {
      fs.copyFileSync(validFiles[0], outputPath);
    } else {
      stitchVideos(jobId, validFiles, outputPath);
    }
  } catch (err) {
    updateJob(jobId, 'failed', { scenes, error: 'FFmpeg falhou ao unir videos' });
    logAudit({ userId, action: 'video_compose.failed', details: { jobId, error: 'ffmpeg' }, ipAddress: '' });
    return;
  }

  const finalStatus = completedScenes === scenes.length ? 'completed' : 'partial';
  const costEstimate = completedScenes * 0.05;

  updateJob(jobId, finalStatus, {
    scenes,
    totalScenes: scenes.length,
    completedScenes,
    videoUrl: `/api/video-composer/download/${jobId}`,
    completed: true,
  }, costEstimate);

  logAudit({ userId, action: 'video_compose.completed', details: { jobId, completedScenes, total: scenes.length }, ipAddress: '' });
  scheduleCleanup(jobId, scenes.length);
}

videoComposerRouter.use(verifyToken);

// POST /compose
videoComposerRouter.post('/compose', async (req, res) => {
  try {
    const { prompt, totalDuration, format = '9:16', narration } = req.body as {
      prompt?: string;
      totalDuration?: number;
      format?: VideoFormat;
      narration?: string;
    };

    if (!prompt || !totalDuration) {
      return res.status(400).json({ error: 'prompt e totalDuration sao obrigatorios' });
    }

    if (totalDuration < 5 || totalDuration > 90) {
      return res.status(400).json({ error: 'totalDuration deve ser entre 5 e 90 segundos' });
    }

    const numScenes = Math.ceil(totalDuration / 6);
    const userId = req.user!.userId;
    const jobId = createJob(userId, prompt);

    let scenes: SceneDesc[];
    try {
      scenes = await generateSceneScript(prompt, numScenes, totalDuration);
    } catch (err) {
      updateJob(jobId, 'failed', { error: 'Falha ao gerar roteiro: ' + (err instanceof Error ? err.message : 'erro') });
      return res.status(502).json({ error: 'Falha ao gerar roteiro com Gemini' });
    }

    scenes.forEach((s) => { s.status = 'pending'; });
    updateJob(jobId, 'processing', { scenes, totalScenes: numScenes, completedScenes: 0 });

    logAudit({ userId, action: 'video_compose.start', details: { jobId, numScenes, format, totalDuration }, ipAddress: req.ip });

    processScenes(jobId, scenes, format, userId).catch(() => {});

    return res.json({ job_id: jobId, scenes, totalScenes: numScenes, status: 'generating' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno ao iniciar composicao' });
  }
});

// GET /status/:jobId
videoComposerRouter.get('/status/:jobId', async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const row = getJob(jobId, req.user!.userId);
    if (!row) return res.status(404).json({ error: 'Job nao encontrado' });

    const parsed = row.result ? JSON.parse(row.result) : {};
    const scenes = (parsed.scenes || []) as SceneDesc[];
    const completedScenes = scenes.filter((s: SceneDesc) => s.status === 'completed').length;

    return res.json({
      job_id: jobId,
      status: row.status,
      totalScenes: parsed.totalScenes || scenes.length,
      completedScenes,
      currentScene: parsed.currentScene || 0,
      scenes: scenes.map((s: SceneDesc) => ({
        scene: s.scene,
        prompt: s.prompt,
        status: s.status || 'pending',
        videoUrl: s.videoUrl || null,
      })),
      finalVideoUrl: parsed.videoUrl || null,
      error: parsed.error || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar status' });
  }
});

// GET /download/:jobId
videoComposerRouter.get('/download/:jobId', async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);
    const row = getJob(jobId, req.user!.userId);
    if (!row) return res.status(404).json({ error: 'Job nao encontrado' });

    const filePath = path.join(UPLOADS_DIR, `compose_${jobId}_final.mp4`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video ainda nao esta pronto' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `inline; filename="compose_${jobId}.mp4"`);
    return res.sendFile(filePath);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao servir video' });
  }
});

// GET /script
videoComposerRouter.get('/script', async (req, res) => {
  try {
    const { prompt, duration, format } = req.query as { prompt?: string; duration?: string; format?: string };

    if (!prompt || !duration) {
      return res.status(400).json({ error: 'prompt e duration sao obrigatorios' });
    }

    const totalDuration = Number(duration);
    if (totalDuration < 5 || totalDuration > 90) {
      return res.status(400).json({ error: 'duration deve ser entre 5 e 90 segundos' });
    }

    const numScenes = Math.ceil(totalDuration / 6);
    const scenes = await generateSceneScript(prompt, numScenes, totalDuration);

    return res.json({ scenes, totalScenes: numScenes, totalDuration, format: format || '9:16' });
  } catch (err) {
    return res.status(502).json({ error: 'Falha ao gerar roteiro: ' + (err instanceof Error ? err.message : 'erro') });
  }
});

export { videoComposerRouter };
