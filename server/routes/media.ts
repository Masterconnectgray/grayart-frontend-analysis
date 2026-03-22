import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { env } from '../config/env';

const mediaRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'server/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo não suportado: ${file.mimetype}`));
    }
  },
});

mediaRouter.use(verifyToken);

// Upload de mídia
mediaRouter.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo é obrigatório' });
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const type = isVideo ? 'video' : 'image';
  const format = path.extname(req.file.originalname).replace('.', '').toLowerCase();

  const result = db.prepare(`
    INSERT INTO media_assets (user_id, type, file_path, file_size, format, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user!.userId, type, req.file.filename, req.file.size, format, nowIso());

  const id = Number(result.lastInsertRowid);

  logAudit(req.user!.userId, 'media.upload', {
    id, type, format, size: req.file.size, originalName: req.file.originalname,
  }, req.ip || '');

  return res.status(201).json({
    id,
    type,
    format,
    size: req.file.size,
    url: `/api/media/file/${id}`,
    originalName: req.file.originalname,
  });
});

// Servir arquivo
mediaRouter.get('/file/:id', (req, res) => {
  const row = db.prepare(`
    SELECT file_path, type, format FROM media_assets WHERE id = ?
  `).get(Number(req.params.id)) as { file_path: string; type: string; format: string } | undefined;

  if (!row) return res.status(404).json({ error: 'Mídia não encontrada' });

  const filePath = path.join(UPLOAD_DIR, row.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado no disco' });

  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  };
  res.setHeader('Content-Type', mimeMap[row.format] || 'application/octet-stream');
  return res.sendFile(filePath);
});

// Listar mídias do usuário
mediaRouter.get('/list', (req, res) => {
  const rows = db.prepare(`
    SELECT id, type, file_path, file_size, format, duration_sec, created_at
    FROM media_assets
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT 50
  `).all(req.user!.userId) as Array<{
    id: number; type: string; file_path: string; file_size: number;
    format: string; duration_sec: number | null; created_at: string;
  }>;

  return res.json({
    media: rows.map(r => ({
      id: r.id,
      type: r.type,
      format: r.format,
      size: r.file_size,
      duration: r.duration_sec,
      url: `/api/media/file/${r.id}`,
      createdAt: r.created_at,
    })),
  });
});

// Deletar mídia
mediaRouter.delete('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT id, file_path FROM media_assets WHERE id = ? AND user_id = ?
  `).get(Number(req.params.id), req.user!.userId) as { id: number; file_path: string } | undefined;

  if (!row) return res.status(404).json({ error: 'Mídia não encontrada' });

  const filePath = path.join(UPLOAD_DIR, row.file_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM media_assets WHERE id = ?').run(row.id);
  logAudit(req.user!.userId, 'media.delete', { id: row.id }, req.ip || '');

  return res.json({ ok: true });
});

// Analisar mídia com Gemini (gera legenda + hashtags)
mediaRouter.post('/analyze/:id', async (req, res) => {
  const { platform = 'instagram', division = 'gray-art' } = req.body as {
    platform?: string; division?: string;
  };

  const row = db.prepare(`
    SELECT id, type, file_path, format FROM media_assets WHERE id = ? AND user_id = ?
  `).get(Number(req.params.id), req.user!.userId) as {
    id: number; type: string; file_path: string; format: string;
  } | undefined;

  if (!row) return res.status(404).json({ error: 'Mídia não encontrada' });

  const filePath = path.join(UPLOAD_DIR, row.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado' });

  try {
    // Upload do arquivo para Gemini File API
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = row.type === 'video' ? `video/${row.format === 'mov' ? 'quicktime' : row.format}` : `image/${row.format}`;

    // Step 1: Upload to File API
    const uploadResp = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'raw',
          'X-Goog-Upload-Command': 'upload, finalize',
          'Content-Type': mimeType,
        },
        body: fileBuffer,
      }
    );

    if (!uploadResp.ok) {
      const err = await uploadResp.text();
      throw new Error(`Upload para Gemini falhou: ${err.slice(0, 200)}`);
    }

    const uploadData = await uploadResp.json() as { file?: { uri?: string; name?: string } };
    const fileUri = uploadData.file?.uri;
    if (!fileUri) throw new Error('Gemini não retornou URI do arquivo');

    // Step 2: Analyze with Gemini
    const prompt = `Analise esta mídia (${row.type}) e gere conteúdo para ${platform} da divisão ${division} do Grupo Gray (empresa de elevadores, engenharia elétrica e networking empresarial).

Retorne APENAS JSON válido neste formato:
{
  "hook": "frase de impacto para o início (máx 15 palavras)",
  "body": "texto principal engajante (2-4 linhas)",
  "cta": "chamada para ação clara",
  "tags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "description": "descrição curta do conteúdo da mídia (1 frase)",
  "suggestedFormat": "reels|carrossel|stories|post",
  "mood": "profissional|divertido|inspirador|educativo"
}`;

    const analyzeResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { fileData: { mimeType, fileUri } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!analyzeResp.ok) {
      const err = await analyzeResp.text();
      throw new Error(`Análise Gemini falhou: ${err.slice(0, 200)}`);
    }

    const analyzeData = await analyzeResp.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { totalTokenCount?: number };
    };

    const rawText = analyzeData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const analysis = JSON.parse(rawText);
    const tokensUsed = analyzeData.usageMetadata?.totalTokenCount || 0;

    logAudit(req.user!.userId, 'media.analyze', {
      mediaId: row.id, platform, division, tokensUsed,
    }, req.ip || '');

    return res.json({ analysis, tokensUsed, mediaId: row.id });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : 'Erro ao analisar mídia',
    });
  }
});

export { mediaRouter };
