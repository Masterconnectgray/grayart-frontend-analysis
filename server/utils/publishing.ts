import { db, nowIso } from '../database';
import { env } from '../config/env';
import { decrypt } from './crypto';
import { flowFetch } from './flow';

type ScheduledRow = {
  id: number;
  user_id: number;
  platform: string;
  content: string;
  scheduled_at: string | null;
  publish_job_id: number | null;
};

export async function publishScheduledPost(postId: number): Promise<{ publishJobId: number }> {
  const post = db.prepare(`
    SELECT id, user_id, platform, content, scheduled_at, publish_job_id
    FROM scheduled_posts
    WHERE id = ?
  `).get(postId) as ScheduledRow | undefined;

  if (!post) {
    throw new Error('Post agendado não encontrado');
  }

  const connection = db.prepare(`
    SELECT access_token_encrypted, account_id
    FROM social_connections
    WHERE user_id = ? AND platform = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).get(post.user_id, post.platform) as
    | { access_token_encrypted: string; account_id: string | null }
    | undefined;

  if (!connection) {
    throw new Error('Conta social não conectada para o usuário.');
  }

  const publishJobId = post.publish_job_id ?? Number(db.prepare(`
    INSERT INTO publish_jobs (user_id, platform, content, status, scheduled_at)
    VALUES (?, ?, ?, 'processing', ?)
  `).run(post.user_id, post.platform, post.content, post.scheduled_at).lastInsertRowid);

  db.prepare(`
    UPDATE scheduled_posts
    SET publish_job_id = ?, status = 'processing'
    WHERE id = ?
  `).run(publishJobId, post.id);

  try {
    const accessToken = decrypt(connection.access_token_encrypted, env.jwtSecret);
    const response = await flowFetch('/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        platform: post.platform,
        access_token: accessToken,
        page_id: connection.account_id,
        caption: post.content,
        media_type: 'IMAGE',
        hashtags: post.content.match(/#\w+/g) || [],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${response.status}`);
    }

    db.prepare(`
      UPDATE publish_jobs
      SET status = 'published', published_at = ?, updated_at = ?
      WHERE id = ?
    `).run(nowIso(), nowIso(), publishJobId);

    db.prepare(`
      UPDATE scheduled_posts
      SET status = 'published'
      WHERE id = ?
    `).run(post.id);

    return { publishJobId };
  } catch (error) {
    db.prepare(`
      UPDATE publish_jobs
      SET status = 'failed', error_message = ?, retry_count = retry_count + 1, updated_at = ?
      WHERE id = ?
    `).run(error instanceof Error ? error.message : 'Erro ao publicar', nowIso(), publishJobId);

    db.prepare(`
      UPDATE scheduled_posts
      SET status = 'failed'
      WHERE id = ?
    `).run(post.id);

    throw error;
  }
}
