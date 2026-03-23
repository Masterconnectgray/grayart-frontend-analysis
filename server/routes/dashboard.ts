import { Router } from 'express';
import { db } from '../database';
import { verifyToken } from '../middleware/auth';

const dashboardRouter = Router();

dashboardRouter.use(verifyToken);

dashboardRouter.get('/stats', (req, res) => {
  const userId = req.user!.userId;

  // Stats do usuario
  const userCopies = (db.prepare(`
    SELECT COUNT(*) as count FROM ai_jobs WHERE user_id = ? AND type = 'copy' AND status = 'completed'
  `).get(userId) as { count: number }).count;

  const userVideos = (db.prepare(`
    SELECT COUNT(*) as count FROM ai_jobs WHERE user_id = ? AND type IN ('video', 'video_v2', 'video_compose') AND status IN ('completed', 'processing')
  `).get(userId) as { count: number }).count;

  const userPublished = (db.prepare(`
    SELECT COUNT(*) as count FROM publish_jobs WHERE user_id = ? AND status = 'published'
  `).get(userId) as { count: number }).count;

  const connectedAccounts = (db.prepare(`
    SELECT COUNT(*) as count FROM social_connections WHERE user_id = ?
  `).get(userId) as { count: number }).count;

  const campaigns = db.prepare(`
    SELECT contacts_json FROM whatsapp_campaigns WHERE user_id = ?
  `).all(userId) as Array<{ contacts_json: string }>;

  const whatsappContacts = campaigns.reduce((sum, c) => {
    try { return sum + (JSON.parse(c.contacts_json) as unknown[]).length; } catch { return sum; }
  }, 0);

  return res.json({
    totalCopies: userCopies,
    totalVideos: userVideos,
    postsPublished: userPublished,
    connectedAccounts,
    whatsappContacts,
  });
});

export { dashboardRouter };
