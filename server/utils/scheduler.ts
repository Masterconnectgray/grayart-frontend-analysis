import { db, nowIso } from '../database';
import { env } from '../config/env';
import { publishScheduledPost } from './publishing';

type DueScheduledPost = {
  id: number;
  user_id: number;
  platform: string;
  content: string;
  scheduled_at: string;
};

export async function processScheduledPosts() {
  let duePosts: DueScheduledPost[];
  try {
    duePosts = db.prepare(`
      SELECT id, user_id, platform, content, scheduled_at
      FROM scheduled_posts
      WHERE status = 'pending' AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
    `).all(nowIso()) as DueScheduledPost[];
  } catch (err) {
    console.error('[scheduler] Erro ao buscar posts agendados:', err);
    return;
  }

  if (duePosts.length === 0) return;
  console.log(`[scheduler] ${duePosts.length} post(s) para publicar`);

  for (const post of duePosts) {
    try {
      const { publishJobId } = await publishScheduledPost(post.id);
      console.log(`[scheduler] Post ${post.id} publicado (job ${publishJobId}) em ${post.platform}`);

      const title = post.content.slice(0, 60) + (post.content.length > 60 ? '...' : '');
      await sendPublishNotification(post.user_id, post.platform, 'published', title);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[scheduler] Falha ao publicar post ${post.id}:`, msg);

      const title = post.content.slice(0, 60) + (post.content.length > 60 ? '...' : '');
      await sendPublishNotification(post.user_id, post.platform, 'failed', title, msg);
    }
  }
}

function findUserWhatsAppInstance(userId: number): { instance: string; phone: string } | null {
  const row = db.prepare(`
    SELECT instance_name, phone FROM whatsapp_approvals
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(userId) as { instance_name: string; phone: string } | undefined;

  if (row) return { instance: row.instance_name, phone: row.phone };

  const campaign = db.prepare(`
    SELECT instance_name, contacts_json FROM whatsapp_campaigns
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(userId) as { instance_name: string; contacts_json: string } | undefined;

  if (campaign) {
    try {
      const contacts = JSON.parse(campaign.contacts_json);
      const phone = Array.isArray(contacts) && contacts[0]?.phone ? contacts[0].phone : null;
      if (phone) return { instance: campaign.instance_name, phone };
    } catch { /* ignore */ }
  }

  return null;
}

async function sendPublishNotification(
  userId: number,
  platform: string,
  status: 'published' | 'failed',
  postTitle: string,
  errorMsg?: string,
) {
  try {
    const wa = findUserWhatsAppInstance(userId);
    if (!wa) return;

    const text = status === 'published'
      ? `Post publicado no ${platform}! '${postTitle}'`
      : `Falha ao publicar no ${platform}: ${errorMsg || 'erro desconhecido'}`;

    const resp = await fetch(`${env.evolutionApiUrl}/message/sendText/${wa.instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.evolutionApiKey,
      },
      body: JSON.stringify({
        number: wa.phone,
        text,
      }),
    });

    if (!resp.ok) {
      console.warn(`[scheduler] WhatsApp notify falhou (${resp.status}) para user ${userId}`);
    }
  } catch (err) {
    console.warn('[scheduler] Erro ao enviar notificação WhatsApp:', err);
  }
}
