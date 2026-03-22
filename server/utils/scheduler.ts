import { db, nowIso } from '../database';
import { publishScheduledPost } from './publishing';

type DueScheduledPost = {
  id: number;
  user_id: number;
  platform: string;
  content: string;
  scheduled_at: string;
};

export async function processScheduledPosts() {
  const duePosts = db.prepare(`
    SELECT id, user_id, platform, content, scheduled_at
    FROM scheduled_posts
    WHERE status = 'pending' AND scheduled_at <= ?
    ORDER BY scheduled_at ASC
  `).all(nowIso()) as DueScheduledPost[];

  for (const post of duePosts) {
    const jobInfo = db.prepare(`
      INSERT INTO publish_jobs (user_id, platform, content, status, scheduled_at)
      VALUES (?, ?, ?, 'processing', ?)
    `).run(post.user_id, post.platform, post.content, post.scheduled_at);

    const publishJobId = Number(jobInfo.lastInsertRowid);
    db.prepare(`UPDATE scheduled_posts SET publish_job_id = ? WHERE id = ?`).run(publishJobId, post.id);

    try {
      await publishScheduledPost(post.id);
    } catch (error) {
      db.prepare(`
        UPDATE publish_jobs
        SET status = 'failed', error_message = ?, retry_count = retry_count + 1, updated_at = ?
        WHERE id = ?
      `).run(error instanceof Error ? error.message : 'Erro ao publicar', nowIso(), publishJobId);
    }
  }
}
