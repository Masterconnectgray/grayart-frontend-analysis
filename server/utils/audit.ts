import { db } from '../database';

interface AuditParams {
  userId: number | null;
  action: string;
  details?: unknown;
  ipAddress?: string;
}

export function logAudit(
  userIdOrParams: number | null | AuditParams,
  action?: string,
  details?: unknown,
  ipAddress?: string
) {
  try {
    let uid: number | null;
    let act: string;
    let det: unknown;
    let ip: string | undefined;

    if (typeof userIdOrParams === 'object' && userIdOrParams !== null && 'action' in userIdOrParams) {
      uid = userIdOrParams.userId;
      act = userIdOrParams.action;
      det = userIdOrParams.details;
      ip = userIdOrParams.ipAddress;
    } else {
      uid = userIdOrParams as number | null;
      act = action || 'unknown';
      det = details;
      ip = ipAddress;
    }

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, details_json, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(
      uid ?? null,
      act,
      det ? JSON.stringify(det) : null,
      ip || null,
    );
  } catch (e) {
    console.error('[audit] Erro ao salvar log:', (e as Error).message);
  }
}
