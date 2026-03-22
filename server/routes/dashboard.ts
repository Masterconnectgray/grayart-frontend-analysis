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
    SELECT COUNT(*) as count FROM ai_jobs WHERE user_id = ? AND type = 'video' AND status IN ('completed', 'processing')
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

  // Fallback global: se user nao tem dados, mostrar totais do sistema
  const globalCopies = userCopies || (db.prepare(`
    SELECT COUNT(*) as count FROM ai_jobs WHERE type = 'copy' AND status = 'completed'
  `).get() as { count: number }).count;

  const globalVideos = userVideos || (db.prepare(`
    SELECT COUNT(*) as count FROM ai_jobs WHERE type = 'video' AND status IN ('completed', 'processing')
  `).get() as { count: number }).count;

  const globalPublished = userPublished || (db.prepare(`
    SELECT COUNT(*) as count FROM publish_jobs WHERE status = 'published'
  `).get() as { count: number }).count;

  return res.json({
    totalCopies: globalCopies,
    totalVideos: globalVideos,
    postsPublished: globalPublished,
    connectedAccounts,
    whatsappContacts,
  });
});

export { dashboardRouter };
