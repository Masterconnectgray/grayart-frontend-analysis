import { Router } from 'express';
import { env } from '../config/env';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { publishScheduledPost } from '../utils/publishing';

const automationRouter = Router();

automationRouter.use(verifyToken);

automationRouter.post('/approve-and-publish', async (req, res) => {
  const { post_id } = req.body as { post_id?: number };
  if (!post_id) {
    return res.status(400).json({ error: 'post_id é obrigatório' });
  }

  const post = db.prepare(`
    SELECT id, user_id, platform, content, scheduled_at, status
    FROM scheduled_posts
    WHERE id = ? AND user_id = ?
  `).get(post_id, req.user!.userId) as
    | { id: number; user_id: number; platform: string; content: string; scheduled_at: string | null; status: string }
    | undefined;

  if (!post) {
    return res.status(404).json({ error: 'Post não encontrado' });
  }

  const hasSchedule = !!post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now();
  db.prepare(`
    UPDATE scheduled_posts
    SET status = ?, approved_at = ?, approval_feedback = NULL
    WHERE id = ? AND user_id = ?
  `).run(hasSchedule ? 'approved' : 'processing', nowIso(), post_id, req.user!.userId);

  logAudit({
    userId: req.user!.userId,
    action: 'automation.approve_and_publish',
    details: { post_id, hasSchedule },
    ipAddress: req.ip,
  });

  if (hasSchedule) {
    return res.json({ post_id, status: 'approved', queued: true });
  }

  try {
    const result = await publishScheduledPost(post_id);
    return res.json({ post_id, status: 'published', publish_job_id: result.publishJobId });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Erro ao publicar post aprovado' });
  }
});

automationRouter.post('/approve-via-whatsapp', async (req, res) => {
  const { post_id, phone, instance } = req.body as {
    post_id?: number;
    phone?: string;
    instance?: string;
  };

  if (!post_id || !phone || !instance) {
    return res.status(400).json({ error: 'post_id, phone e instance são obrigatórios' });
  }

  const post = db.prepare(`
    SELECT id, content, platform
    FROM scheduled_posts
    WHERE id = ? AND user_id = ?
  `).get(post_id, req.user!.userId) as
    | { id: number; content: string; platform: string }
    | undefined;

  if (!post) {
    return res.status(404).json({ error: 'Post não encontrado' });
  }

  db.prepare(`
    INSERT INTO whatsapp_approvals (user_id, post_id, phone, instance_name, status, last_message)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(
    req.user!.userId,
    post_id,
    phone,
    instance,
    'Reel pronto. Responda 1 para aprovar, 2 para alterar.',
  );

  const response = await fetch(`${env.evolutionApiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.evolutionApiKey,
    },
    body: JSON.stringify({
      number: phone,
      textMessage: {
        text: `Reel pronto. Responda 1 para aprovar, 2 para alterar.\n\nPlataforma: ${post.platform}\nPrévia: ${post.content.slice(0, 140)}`,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return res.status(response.status).json({ error: (err as { message?: string }).message || 'Erro ao enviar aprovação via WhatsApp' });
  }

  logAudit({
    userId: req.user!.userId,
    action: 'automation.approve_via_whatsapp',
    details: { post_id, phone, instance },
    ipAddress: req.ip,
  });

  return res.json({ post_id, phone, instance, status: 'pending_whatsapp_approval' });
});

automationRouter.get('/pending-approvals', (req, res) => {
  const posts = db.prepare(`
    SELECT sp.id, sp.platform, sp.content, sp.scheduled_at, sp.status, sp.created_at,
           wa.phone, wa.instance_name, wa.status as whatsapp_status, wa.created_at as requested_at
    FROM scheduled_posts sp
    LEFT JOIN whatsapp_approvals wa
      ON wa.post_id = sp.id AND wa.user_id = sp.user_id
    WHERE sp.user_id = ?
      AND sp.status IN ('pending', 'pending_approval', 'pending_whatsapp_approval')
    ORDER BY datetime(sp.created_at) DESC, sp.id DESC
  `).all(req.user!.userId);

  return res.json({ posts });
});

automationRouter.post('/request-changes', (req, res) => {
  const { post_id, feedback } = req.body as { post_id?: number; feedback?: string };
  if (!post_id || !feedback?.trim()) {
    return res.status(400).json({ error: 'post_id e feedback são obrigatórios' });
  }

  const result = db.prepare(`
    UPDATE scheduled_posts
    SET status = 'changes_requested', approval_feedback = ?, changes_requested_at = ?
    WHERE id = ? AND user_id = ?
  `).run(feedback.trim(), nowIso(), post_id, req.user!.userId);

  if (!result.changes) {
    return res.status(404).json({ error: 'Post não encontrado' });
  }

  db.prepare(`
    UPDATE whatsapp_approvals
    SET status = 'changes_requested', last_message = ?, responded_at = ?
    WHERE post_id = ? AND user_id = ? AND status = 'pending'
  `).run(feedback.trim(), nowIso(), post_id, req.user!.userId);

  logAudit({
    userId: req.user!.userId,
    action: 'automation.request_changes',
    details: { post_id, feedback },
    ipAddress: req.ip,
  });

  return res.json({ post_id, status: 'changes_requested', feedback: feedback.trim() });
});

automationRouter.get('/approval-status/:post_id', (req, res) => {
  const postId = Number(req.params.post_id);
  const post = db.prepare(`
    SELECT sp.id, sp.platform, sp.content, sp.status, sp.scheduled_at, sp.created_at,
           sp.approved_at, sp.changes_requested_at, sp.approval_feedback,
           pj.id as publish_job_id, pj.status as publish_status, pj.published_at, pj.error_message
    FROM scheduled_posts sp
    LEFT JOIN publish_jobs pj ON pj.id = sp.publish_job_id
    WHERE sp.id = ? AND sp.user_id = ?
  `).get(postId, req.user!.userId) as
    | {
        id: number;
        platform: string;
        content: string;
        status: string;
        scheduled_at: string | null;
        created_at: string;
        approved_at: string | null;
        changes_requested_at: string | null;
        approval_feedback: string | null;
        publish_job_id: number | null;
        publish_status: string | null;
        published_at: string | null;
        error_message: string | null;
      }
    | undefined;

  if (!post) {
    return res.status(404).json({ error: 'Post não encontrado' });
  }

  return res.json({
    post_id: post.id,
    status: post.status === 'processing' && post.publish_status === 'published' ? 'published' : post.status,
    platform: post.platform,
    content: post.content,
    scheduled_at: post.scheduled_at,
    created_at: post.created_at,
    approved_at: post.approved_at,
    changes_requested_at: post.changes_requested_at,
    published_at: post.published_at,
    feedback: post.approval_feedback,
    publish_job_id: post.publish_job_id,
    publish_status: post.publish_status,
    error_message: post.error_message,
  });
});

export { automationRouter };
