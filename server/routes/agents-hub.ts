import { Router } from 'express';
import type { Request, Response } from 'express';
import { db, nowIso } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const agentsHubRouter = Router();

agentsHubRouter.use(verifyToken);
agentsHubRouter.use((req, res, next) => {
  void res;
  ensureDefaultAgents(req.user!.userId);
  next();
});

type Primitive = string | number | boolean | null;
type JsonRecord = Record<string, Primitive | Primitive[] | JsonRecord | JsonRecord[]>;

interface DefaultAgent {
  agentKey: string;
  name: string;
  role: string;
  model: string;
  provider: string;
  avatar: string;
  color: string;
}

const DEFAULT_AGENTS: DefaultAgent[] = [
  {
    agentKey: 'genio-financeiro',
    name: 'Gênio Financeiro',
    role: 'Financeiro, extratos, indicadores, conciliações',
    model: 'gemini-2.5-flash',
    provider: 'google',
    avatar: '🧠',
    color: '#22c55e',
  },
  {
    agentKey: 'cronos',
    name: 'Cronos',
    role: 'Memória persistente e coordenação pessoal',
    model: 'gpt-5.4-mini',
    provider: 'openai',
    avatar: '⏳',
    color: '#eab308',
  },
  {
    agentKey: 'gideao',
    name: 'Gideão',
    role: 'WhatsApp e atendimento operacional',
    model: 'gemini-2.5-flash',
    provider: 'google',
    avatar: '📲',
    color: '#38bdf8',
  },
  {
    agentKey: 'falcao',
    name: 'Falcão',
    role: 'Diagnóstico e correções automáticas',
    model: 'gemma4:e4b',
    provider: 'ollama',
    avatar: '🛠️',
    color: '#f97316',
  },
  {
    agentKey: 'israel',
    name: 'Israel',
    role: 'OpenClaw legada e execução técnica',
    model: 'claude-sonnet',
    provider: 'anthropic',
    avatar: '🧩',
    color: '#a78bfa',
  },
  {
    agentKey: 'galo',
    name: 'Galo',
    role: 'Auto-fix de código e incidentes',
    model: 'gemma4:e4b',
    provider: 'ollama',
    avatar: '🐓',
    color: '#fb7185',
  },
  {
    agentKey: 'minerador',
    name: 'Minerador',
    role: 'Ingestão de cursos, transcrições e RAG',
    model: 'gemini-2.5-flash',
    provider: 'google',
    avatar: '⛏️',
    color: '#14b8a6',
  },
  {
    agentKey: 'orquestrador',
    name: 'Orquestrador',
    role: 'Distribuição de tarefas entre agentes',
    model: 'rules-engine',
    provider: 'internal',
    avatar: '🛰️',
    color: '#60a5fa',
  },
  {
    agentKey: 'gray-rag',
    name: 'Gray RAG',
    role: 'Busca e recuperação de contexto',
    model: 'rag-pipeline',
    provider: 'internal',
    avatar: '📚',
    color: '#34d399',
  },
  {
    agentKey: 'carla',
    name: 'Carla',
    role: 'Painel e disparos WhatsApp',
    model: 'automation',
    provider: 'internal',
    avatar: '📣',
    color: '#f59e0b',
  },
  {
    agentKey: 'whisper',
    name: 'Whisper Server',
    role: 'Transcrição de áudio e voz',
    model: 'whisper',
    provider: 'openai',
    avatar: '🎙️',
    color: '#06b6d4',
  },
];

interface AgentRow {
  id: number;
  user_id: number;
  agent_key: string;
  name: string;
  role: string | null;
  model: string | null;
  provider: string | null;
  avatar: string | null;
  color: string | null;
  status: string;
  is_enabled: number;
  health_score: number;
  metadata_json: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ThreadRow {
  id: number;
  user_id: number;
  thread_key: string;
  title: string;
  scope: string;
  target_agent_id: number | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  user_id: number;
  thread_id: number;
  sender_type: string;
  sender_agent_id: number | null;
  content: string;
  payload_json: string | null;
  status: string;
  error_code: string | null;
  read_at: string | null;
  created_at: string;
}

interface TaskRow {
  id: number;
  user_id: number;
  thread_id: number | null;
  source_message_id: number | null;
  assigned_agent_id: number | null;
  title: string | null;
  instruction: string;
  priority: string;
  status: string;
  result_summary: string | null;
  result_payload_json: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeLimit(raw: unknown, defaultValue: number, maxValue: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return Math.min(Math.floor(parsed), maxValue);
}

function emitHubEvent(
  userId: number,
  eventType: string,
  entityType: string,
  entityId: number | null,
  payload?: JsonRecord
) {
  db.prepare(`
    INSERT INTO ai_events (user_id, event_type, entity_type, entity_id, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, eventType, entityType, entityId, payload ? JSON.stringify(payload) : null, nowIso());
}

function ensureDefaultAgents(userId: number) {
  const insertAgent = db.prepare(`
    INSERT OR IGNORE INTO ai_agents (
      user_id, agent_key, name, role, model, provider, avatar, color,
      status, is_enabled, health_score, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'offline', 1, 100, NULL, ?, ?)
  `);

  const ensureGroupThread = db.prepare(`
    INSERT OR IGNORE INTO ai_threads (
      user_id, thread_key, title, scope, target_agent_id, created_at, updated_at
    ) VALUES (?, 'group:main', 'Grupo de Agentes', 'group', NULL, ?, ?)
  `);

  const now = nowIso();
  const tx = db.transaction(() => {
    for (const agent of DEFAULT_AGENTS) {
      insertAgent.run(
        userId,
        agent.agentKey,
        agent.name,
        agent.role,
        agent.model,
        agent.provider,
        agent.avatar,
        agent.color,
        now,
        now,
      );
    }
    ensureGroupThread.run(userId, now, now);
  });
  tx();
}

function findAgentByKey(userId: number, agentKey: string): AgentRow | undefined {
  return db.prepare(`
    SELECT *
    FROM ai_agents
    WHERE user_id = ? AND agent_key = ?
  `).get(userId, agentKey) as AgentRow | undefined;
}

function ensureThread(
  userId: number,
  params: {
    threadKey?: string;
    title: string;
    scope: 'group' | 'direct';
    targetAgentId?: number | null;
  }
): ThreadRow {
  const threadKey = params.threadKey || (params.scope === 'group'
    ? 'group:main'
    : `dm:${params.targetAgentId ?? 'unknown'}`);
  const now = nowIso();

  db.prepare(`
    INSERT INTO ai_threads (
      user_id, thread_key, title, scope, target_agent_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, thread_key)
    DO UPDATE SET
      title = excluded.title,
      scope = excluded.scope,
      target_agent_id = excluded.target_agent_id,
      updated_at = excluded.updated_at
  `).run(
    userId,
    threadKey,
    params.title,
    params.scope,
    params.targetAgentId ?? null,
    now,
    now,
  );

  return db.prepare(`
    SELECT *
    FROM ai_threads
    WHERE user_id = ? AND thread_key = ?
  `).get(userId, threadKey) as ThreadRow;
}

function resolveThread(
  userId: number,
  threadId?: number,
  threadKey?: string
): ThreadRow | undefined {
  if (threadId) {
    return db.prepare(`
      SELECT *
      FROM ai_threads
      WHERE user_id = ? AND id = ?
    `).get(userId, threadId) as ThreadRow | undefined;
  }

  if (threadKey) {
    return db.prepare(`
      SELECT *
      FROM ai_threads
      WHERE user_id = ? AND thread_key = ?
    `).get(userId, threadKey) as ThreadRow | undefined;
  }

  return db.prepare(`
    SELECT *
    FROM ai_threads
    WHERE user_id = ? AND thread_key = 'group:main'
  `).get(userId) as ThreadRow | undefined;
}

function buildThreadResponse(thread: ThreadRow) {
  const targetAgent = thread.target_agent_id
    ? (db.prepare(`
      SELECT agent_key, name, avatar, color
      FROM ai_agents
      WHERE id = ?
    `).get(thread.target_agent_id) as
      | { agent_key: string; name: string; avatar: string | null; color: string | null }
      | undefined)
    : undefined;

  return {
    id: thread.id,
    threadKey: thread.thread_key,
    title: thread.title,
    scope: thread.scope,
    targetAgent: targetAgent ? {
      agentKey: targetAgent.agent_key,
      name: targetAgent.name,
      avatar: targetAgent.avatar,
      color: targetAgent.color,
    } : null,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
  };
}

function mapMessage(message: MessageRow & {
  sender_agent_key?: string | null;
  sender_agent_name?: string | null;
  sender_agent_avatar?: string | null;
}) {
  return {
    id: message.id,
    threadId: message.thread_id,
    senderType: message.sender_type,
    senderAgent: message.sender_agent_id ? {
      id: message.sender_agent_id,
      agentKey: message.sender_agent_key || null,
      name: message.sender_agent_name || null,
      avatar: message.sender_agent_avatar || null,
    } : null,
    content: message.content,
    payload: safeJsonParse<JsonRecord | null>(message.payload_json, null),
    status: message.status,
    errorCode: message.error_code,
    readAt: message.read_at,
    createdAt: message.created_at,
  };
}

agentsHubRouter.get('/overview', (req, res) => {
  const userId = req.user!.userId;
  ensureDefaultAgents(userId);

  const activeAgents = (db.prepare(`
    SELECT COUNT(*) AS total
    FROM ai_agents
    WHERE user_id = ? AND is_enabled = 1 AND status IN ('online', 'busy', 'idle')
  `).get(userId) as { total: number }).total;

  const queuedTasks = (db.prepare(`
    SELECT COUNT(*) AS total
    FROM ai_tasks
    WHERE user_id = ? AND status IN ('queued', 'running', 'blocked')
  `).get(userId) as { total: number }).total;

  const openFailures = (db.prepare(`
    SELECT COUNT(*) AS total
    FROM ai_failures
    WHERE user_id = ? AND status IN ('open', 'in_progress')
  `).get(userId) as { total: number }).total;

  const unreadMessages = (db.prepare(`
    SELECT COUNT(*) AS total
    FROM ai_messages
    WHERE user_id = ? AND sender_type = 'agent' AND read_at IS NULL
  `).get(userId) as { total: number }).total;

  const lastReports = db.prepare(`
    SELECT r.id, r.title, r.report_type, r.created_at, a.agent_key
    FROM ai_reports r
    LEFT JOIN ai_agents a ON a.id = r.agent_id
    WHERE r.user_id = ?
    ORDER BY r.id DESC
    LIMIT 5
  `).all(userId) as Array<{
    id: number;
    title: string;
    report_type: string;
    created_at: string;
    agent_key: string | null;
  }>;

  return res.json({
    summary: {
      activeAgents,
      queuedTasks,
      openFailures,
      unreadMessages,
    },
    lastReports: lastReports.map((report) => ({
      id: report.id,
      title: report.title,
      reportType: report.report_type,
      agentKey: report.agent_key,
      createdAt: report.created_at,
    })),
  });
});

agentsHubRouter.get('/agents', (req, res) => {
  const userId = req.user!.userId;
  ensureDefaultAgents(userId);

  const agents = db.prepare(`
    SELECT *
    FROM ai_agents
    WHERE user_id = ?
    ORDER BY
      CASE status
        WHEN 'busy' THEN 0
        WHEN 'online' THEN 1
        WHEN 'idle' THEN 2
        WHEN 'error' THEN 3
        ELSE 4
      END,
      name ASC
  `).all(userId) as AgentRow[];

  return res.json({
    agents: agents.map((agent) => ({
      id: agent.id,
      agentKey: agent.agent_key,
      name: agent.name,
      role: agent.role,
      model: agent.model,
      provider: agent.provider,
      avatar: agent.avatar,
      color: agent.color,
      status: agent.status,
      isEnabled: Boolean(agent.is_enabled),
      healthScore: agent.health_score,
      metadata: safeJsonParse<JsonRecord | null>(agent.metadata_json, null),
      lastHeartbeatAt: agent.last_heartbeat_at,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    })),
  });
});

agentsHubRouter.post('/agents', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    agents?: Array<{
      agentKey: string;
      name: string;
      role?: string;
      model?: string;
      provider?: string;
      avatar?: string;
      color?: string;
      status?: string;
      isEnabled?: boolean;
      healthScore?: number;
      metadata?: JsonRecord;
    }>;
  };

  const payload = body.agents || [];
  if (!payload.length) {
    return res.status(400).json({ error: 'agents é obrigatório e precisa ter ao menos 1 item' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO ai_agents (
      user_id, agent_key, name, role, model, provider, avatar, color, status,
      is_enabled, health_score, metadata_json, last_heartbeat_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, agent_key)
    DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      model = excluded.model,
      provider = excluded.provider,
      avatar = excluded.avatar,
      color = excluded.color,
      status = excluded.status,
      is_enabled = excluded.is_enabled,
      health_score = excluded.health_score,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `);

  const now = nowIso();
  const tx = db.transaction(() => {
    for (const item of payload) {
      if (!item.agentKey?.trim() || !item.name?.trim()) {
        throw new Error('agentKey e name são obrigatórios para todos os agentes');
      }

      upsertStmt.run(
        userId,
        item.agentKey.trim(),
        item.name.trim(),
        item.role || null,
        item.model || null,
        item.provider || null,
        item.avatar || null,
        item.color || null,
        item.status || 'offline',
        item.isEnabled === false ? 0 : 1,
        Number.isFinite(item.healthScore) ? Math.max(0, Math.min(100, Number(item.healthScore))) : 100,
        item.metadata ? JSON.stringify(item.metadata) : null,
        null,
        now,
        now,
      );
    }
  });

  try {
    tx();
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Falha ao salvar agentes' });
  }

  emitHubEvent(userId, 'agents.upserted', 'agent', null, { total: payload.length });
  logAudit({
    userId,
    action: 'agents_hub.agents_upsert',
    details: { total: payload.length },
    ipAddress: req.ip,
  });

  const updated = db.prepare(`
    SELECT *
    FROM ai_agents
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(userId, payload.length) as AgentRow[];

  return res.status(201).json({
    agents: updated.map((agent) => ({
      id: agent.id,
      agentKey: agent.agent_key,
      name: agent.name,
      status: agent.status,
      updatedAt: agent.updated_at,
    })),
  });
});

agentsHubRouter.patch('/agents/:agentKey/status', (req, res) => {
  const userId = req.user!.userId;
  const agentKey = String(req.params.agentKey || '').trim();
  const body = req.body as {
    status?: string;
    healthScore?: number;
    metadata?: JsonRecord;
  };

  const allowedStatus = new Set(['offline', 'online', 'busy', 'idle', 'error']);
  if (!body.status || !allowedStatus.has(body.status)) {
    return res.status(400).json({ error: 'status inválido. Use: offline, online, busy, idle, error' });
  }

  const current = findAgentByKey(userId, agentKey);
  if (!current) {
    return res.status(404).json({ error: 'Agente não encontrado' });
  }

  const nextHealth = Number.isFinite(body.healthScore)
    ? Math.max(0, Math.min(100, Number(body.healthScore)))
    : current.health_score;

  const nextMetadata = body.metadata
    ? JSON.stringify(body.metadata)
    : current.metadata_json;

  const timestamp = nowIso();
  db.prepare(`
    UPDATE ai_agents
    SET status = ?, health_score = ?, metadata_json = ?, last_heartbeat_at = ?, updated_at = ?
    WHERE user_id = ? AND agent_key = ?
  `).run(
    body.status,
    nextHealth,
    nextMetadata,
    timestamp,
    timestamp,
    userId,
    agentKey,
  );

  const updated = findAgentByKey(userId, agentKey) as AgentRow;
  emitHubEvent(userId, 'agent.status_changed', 'agent', updated.id, {
    agentKey: updated.agent_key,
    status: updated.status,
    healthScore: updated.health_score,
  });

  return res.json({
    agent: {
      id: updated.id,
      agentKey: updated.agent_key,
      status: updated.status,
      healthScore: updated.health_score,
      metadata: safeJsonParse<JsonRecord | null>(updated.metadata_json, null),
      lastHeartbeatAt: updated.last_heartbeat_at,
      updatedAt: updated.updated_at,
    },
  });
});

agentsHubRouter.post('/agents/:agentKey/heartbeat', (req, res) => {
  const userId = req.user!.userId;
  const agentKey = String(req.params.agentKey || '').trim();
  const body = req.body as {
    status?: string;
    healthScore?: number;
    metadata?: JsonRecord;
  };

  const status = body.status || 'online';
  const allowedStatus = new Set(['offline', 'online', 'busy', 'idle', 'error']);
  if (!allowedStatus.has(status)) {
    return res.status(400).json({ error: 'status inválido no heartbeat' });
  }

  const agent = findAgentByKey(userId, agentKey);
  if (!agent) {
    return res.status(404).json({ error: 'Agente não encontrado' });
  }

  const timestamp = nowIso();
  db.prepare(`
    UPDATE ai_agents
    SET status = ?, health_score = ?, metadata_json = ?, last_heartbeat_at = ?, updated_at = ?
    WHERE user_id = ? AND agent_key = ?
  `).run(
    status,
    Number.isFinite(body.healthScore) ? Math.max(0, Math.min(100, Number(body.healthScore))) : agent.health_score,
    body.metadata ? JSON.stringify(body.metadata) : agent.metadata_json,
    timestamp,
    timestamp,
    userId,
    agentKey,
  );

  emitHubEvent(userId, 'agent.heartbeat', 'agent', agent.id, {
    agentKey,
    status,
  });

  return res.json({ ok: true, agentKey, status, heartbeatAt: timestamp });
});

agentsHubRouter.get('/threads', (req, res) => {
  const userId = req.user!.userId;
  ensureDefaultAgents(userId);

  const threads = db.prepare(`
    SELECT
      t.*,
      a.agent_key AS target_agent_key,
      a.name AS target_agent_name,
      a.avatar AS target_agent_avatar,
      a.color AS target_agent_color,
      (
        SELECT COUNT(*)
        FROM ai_messages m
        WHERE m.thread_id = t.id
      ) AS message_count,
      (
        SELECT m.content
        FROM ai_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.id DESC
        LIMIT 1
      ) AS last_message,
      (
        SELECT m.created_at
        FROM ai_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.id DESC
        LIMIT 1
      ) AS last_message_at
    FROM ai_threads t
    LEFT JOIN ai_agents a ON a.id = t.target_agent_id
    WHERE t.user_id = ?
    ORDER BY COALESCE(last_message_at, t.updated_at) DESC, t.id DESC
  `).all(userId) as Array<
    ThreadRow & {
      target_agent_key: string | null;
      target_agent_name: string | null;
      target_agent_avatar: string | null;
      target_agent_color: string | null;
      message_count: number;
      last_message: string | null;
      last_message_at: string | null;
    }
  >;

  return res.json({
    threads: threads.map((thread) => ({
      id: thread.id,
      threadKey: thread.thread_key,
      title: thread.title,
      scope: thread.scope,
      targetAgent: thread.target_agent_key ? {
        agentKey: thread.target_agent_key,
        name: thread.target_agent_name,
        avatar: thread.target_agent_avatar,
        color: thread.target_agent_color,
      } : null,
      messageCount: thread.message_count,
      lastMessage: thread.last_message,
      lastMessageAt: thread.last_message_at,
      createdAt: thread.created_at,
      updatedAt: thread.updated_at,
    })),
  });
});

agentsHubRouter.post('/threads', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    threadKey?: string;
    title?: string;
    scope?: 'group' | 'direct';
    targetAgentKey?: string;
  };

  const scope = body.scope || 'group';
  if (scope !== 'group' && scope !== 'direct') {
    return res.status(400).json({ error: 'scope deve ser group ou direct' });
  }

  let targetAgentId: number | null = null;
  if (scope === 'direct') {
    if (!body.targetAgentKey?.trim()) {
      return res.status(400).json({ error: 'targetAgentKey é obrigatório para threads direct' });
    }
    const target = findAgentByKey(userId, body.targetAgentKey.trim());
    if (!target) {
      return res.status(404).json({ error: 'Agente de destino não encontrado' });
    }
    targetAgentId = target.id;
  }

  const threadTitle = body.title?.trim()
    || (scope === 'group' ? 'Grupo de Agentes' : `Conversa com ${body.targetAgentKey}`);

  const thread = ensureThread(userId, {
    threadKey: body.threadKey?.trim(),
    title: threadTitle,
    scope,
    targetAgentId,
  });

  emitHubEvent(userId, 'thread.upserted', 'thread', thread.id, {
    threadKey: thread.thread_key,
    scope: thread.scope,
  });

  return res.status(201).json({ thread: buildThreadResponse(thread) });
});

agentsHubRouter.get('/messages', (req, res) => {
  const userId = req.user!.userId;
  const threadId = req.query.threadId ? Number(req.query.threadId) : undefined;
  const threadKey = typeof req.query.threadKey === 'string' ? req.query.threadKey : undefined;
  const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;
  const limit = normalizeLimit(req.query.limit, 100, 500);

  const thread = resolveThread(userId, threadId, threadKey);
  if (!thread) {
    return res.status(404).json({ error: 'Thread não encontrada' });
  }

  const params: Array<number> = [thread.id];
  let sql = `
    SELECT
      m.*,
      a.agent_key AS sender_agent_key,
      a.name AS sender_agent_name,
      a.avatar AS sender_agent_avatar
    FROM ai_messages m
    LEFT JOIN ai_agents a ON a.id = m.sender_agent_id
    WHERE m.thread_id = ?
  `;

  if (beforeId && Number.isFinite(beforeId)) {
    sql += ' AND m.id < ?';
    params.push(beforeId);
  }

  sql += ' ORDER BY m.id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Array<
    MessageRow & {
      sender_agent_key: string | null;
      sender_agent_name: string | null;
      sender_agent_avatar: string | null;
    }
  >;

  const messages = rows.reverse().map((row) => mapMessage(row));
  return res.json({
    thread: buildThreadResponse(thread),
    messages,
  });
});

agentsHubRouter.post('/messages', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    threadId?: number;
    threadKey?: string;
    scope?: 'group' | 'direct';
    title?: string;
    targetAgentKey?: string;
    senderType?: 'user' | 'agent' | 'system';
    senderAgentKey?: string;
    content?: string;
    payload?: JsonRecord;
    createTask?: boolean;
    taskTitle?: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };

  const content = (body.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: 'content é obrigatório' });
  }

  const senderType = body.senderType || 'user';
  if (!['user', 'agent', 'system'].includes(senderType)) {
    return res.status(400).json({ error: 'senderType inválido' });
  }

  let senderAgentId: number | null = null;
  if (senderType === 'agent') {
    if (!body.senderAgentKey?.trim()) {
      return res.status(400).json({ error: 'senderAgentKey é obrigatório quando senderType=agent' });
    }
    const sender = findAgentByKey(userId, body.senderAgentKey.trim());
    if (!sender) {
      return res.status(404).json({ error: 'Agente remetente não encontrado' });
    }
    senderAgentId = sender.id;
  }

  let thread = resolveThread(userId, body.threadId, body.threadKey?.trim());
  if (!thread) {
    const scope = body.scope || (body.targetAgentKey ? 'direct' : 'group');
    let targetAgentId: number | null = null;
    if (scope === 'direct' && body.targetAgentKey?.trim()) {
      const target = findAgentByKey(userId, body.targetAgentKey.trim());
      if (!target) {
        return res.status(404).json({ error: 'Agente de destino não encontrado' });
      }
      targetAgentId = target.id;
    }
    thread = ensureThread(userId, {
      threadKey: body.threadKey?.trim(),
      title: body.title?.trim() || (scope === 'group' ? 'Grupo de Agentes' : `Conversa ${body.targetAgentKey}`),
      scope,
      targetAgentId,
    });
  }

  const inserted = db.prepare(`
    INSERT INTO ai_messages (
      user_id, thread_id, sender_type, sender_agent_id, content, payload_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'delivered', ?)
  `).run(
    userId,
    thread.id,
    senderType,
    senderAgentId,
    content,
    body.payload ? JSON.stringify(body.payload) : null,
    nowIso(),
  );

  const messageId = Number(inserted.lastInsertRowid);
  db.prepare(`
    UPDATE ai_threads
    SET updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(nowIso(), thread.id, userId);

  let taskResponse: Record<string, unknown> | null = null;
  const shouldCreateTask = Boolean(body.createTask) && senderType === 'user';

  if (shouldCreateTask) {
    let assignedAgentId: number | null = null;
    if (body.targetAgentKey?.trim()) {
      const target = findAgentByKey(userId, body.targetAgentKey.trim());
      if (target) assignedAgentId = target.id;
    } else if (thread.target_agent_id) {
      assignedAgentId = thread.target_agent_id;
    }

    const taskInsert = db.prepare(`
      INSERT INTO ai_tasks (
        user_id, thread_id, source_message_id, assigned_agent_id, title, instruction,
        priority, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)
    `).run(
      userId,
      thread.id,
      messageId,
      assignedAgentId,
      body.taskTitle?.trim() || 'Tarefa criada pelo chat',
      content,
      body.priority || 'normal',
      nowIso(),
      nowIso(),
    );

    const taskId = Number(taskInsert.lastInsertRowid);
    taskResponse = {
      id: taskId,
      status: 'queued',
      assignedAgentId,
    };
    emitHubEvent(userId, 'task.created', 'task', taskId, {
      threadId: thread.id,
      sourceMessageId: messageId,
      assignedAgentId,
    });
  }

  emitHubEvent(userId, 'message.created', 'message', messageId, {
    threadId: thread.id,
    senderType,
  });

  const message = db.prepare(`
    SELECT
      m.*,
      a.agent_key AS sender_agent_key,
      a.name AS sender_agent_name,
      a.avatar AS sender_agent_avatar
    FROM ai_messages m
    LEFT JOIN ai_agents a ON a.id = m.sender_agent_id
    WHERE m.id = ? AND m.user_id = ?
  `).get(messageId, userId) as MessageRow & {
    sender_agent_key: string | null;
    sender_agent_name: string | null;
    sender_agent_avatar: string | null;
  };

  return res.status(201).json({
    thread: buildThreadResponse(thread),
    message: mapMessage(message),
    task: taskResponse,
  });
});

agentsHubRouter.post('/messages/mark-read', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    threadId?: number;
    threadKey?: string;
    upToId?: number;
  };

  const thread = resolveThread(userId, body.threadId, body.threadKey?.trim());
  if (!thread) {
    return res.status(404).json({ error: 'Thread não encontrada' });
  }

  const readAt = nowIso();
  let changes = 0;
  if (body.upToId && Number.isFinite(body.upToId)) {
    const result = db.prepare(`
      UPDATE ai_messages
      SET read_at = ?
      WHERE user_id = ? AND thread_id = ? AND sender_type = 'agent' AND read_at IS NULL AND id <= ?
    `).run(readAt, userId, thread.id, body.upToId);
    changes = result.changes;
  } else {
    const result = db.prepare(`
      UPDATE ai_messages
      SET read_at = ?
      WHERE user_id = ? AND thread_id = ? AND sender_type = 'agent' AND read_at IS NULL
    `).run(readAt, userId, thread.id);
    changes = result.changes;
  }

  emitHubEvent(userId, 'message.read', 'thread', thread.id, { changed: changes });
  return res.json({ ok: true, changed: changes, readAt });
});

agentsHubRouter.get('/tasks', (req, res) => {
  const userId = req.user!.userId;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const priority = typeof req.query.priority === 'string' ? req.query.priority.trim() : '';
  const agentKey = typeof req.query.agentKey === 'string' ? req.query.agentKey.trim() : '';
  const limit = normalizeLimit(req.query.limit, 100, 300);

  let assignedAgentId: number | null = null;
  if (agentKey) {
    const agent = findAgentByKey(userId, agentKey);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado para filtro' });
    }
    assignedAgentId = agent.id;
  }

  const conditions = ['t.user_id = ?'];
  const params: Array<string | number> = [userId];

  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }
  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }
  if (assignedAgentId !== null) {
    conditions.push('t.assigned_agent_id = ?');
    params.push(assignedAgentId);
  }

  params.push(limit);
  const rows = db.prepare(`
    SELECT
      t.*,
      a.agent_key,
      a.name AS agent_name,
      th.thread_key
    FROM ai_tasks t
    LEFT JOIN ai_agents a ON a.id = t.assigned_agent_id
    LEFT JOIN ai_threads th ON th.id = t.thread_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.id DESC
    LIMIT ?
  `).all(...params) as Array<TaskRow & {
    agent_key: string | null;
    agent_name: string | null;
    thread_key: string | null;
  }>;

  return res.json({
    tasks: rows.map((task) => ({
      id: task.id,
      threadId: task.thread_id,
      threadKey: task.thread_key,
      sourceMessageId: task.source_message_id,
      assignedAgent: task.assigned_agent_id ? {
        id: task.assigned_agent_id,
        agentKey: task.agent_key,
        name: task.agent_name,
      } : null,
      title: task.title,
      instruction: task.instruction,
      priority: task.priority,
      status: task.status,
      resultSummary: task.result_summary,
      resultPayload: safeJsonParse<JsonRecord | null>(task.result_payload_json, null),
      createdAt: task.created_at,
      startedAt: task.started_at,
      finishedAt: task.finished_at,
      updatedAt: task.updated_at,
    })),
  });
});

agentsHubRouter.post('/tasks', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    threadId?: number;
    threadKey?: string;
    sourceMessageId?: number;
    assignedAgentKey?: string;
    title?: string;
    instruction?: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };

  const instruction = (body.instruction || '').trim();
  if (!instruction) {
    return res.status(400).json({ error: 'instruction é obrigatório' });
  }

  let threadId: number | null = null;
  if (body.threadId || body.threadKey) {
    const thread = resolveThread(userId, body.threadId, body.threadKey?.trim());
    if (!thread) {
      return res.status(404).json({ error: 'Thread não encontrada para a tarefa' });
    }
    threadId = thread.id;
  }

  let assignedAgentId: number | null = null;
  if (body.assignedAgentKey?.trim()) {
    const agent = findAgentByKey(userId, body.assignedAgentKey.trim());
    if (!agent) {
      return res.status(404).json({ error: 'Agente atribuído não encontrado' });
    }
    assignedAgentId = agent.id;
  }

  const allowedPriority = new Set(['low', 'normal', 'high', 'critical']);
  const priority = allowedPriority.has(body.priority || 'normal') ? (body.priority || 'normal') : 'normal';

  const insert = db.prepare(`
    INSERT INTO ai_tasks (
      user_id, thread_id, source_message_id, assigned_agent_id, title, instruction,
      priority, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)
  `).run(
    userId,
    threadId,
    body.sourceMessageId || null,
    assignedAgentId,
    body.title?.trim() || 'Tarefa manual',
    instruction,
    priority,
    nowIso(),
    nowIso(),
  );

  const taskId = Number(insert.lastInsertRowid);
  emitHubEvent(userId, 'task.created', 'task', taskId, {
    assignedAgentId,
    priority,
  });

  logAudit({
    userId,
    action: 'agents_hub.task_create',
    details: { taskId, assignedAgentId, priority },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    task: {
      id: taskId,
      status: 'queued',
      priority,
      assignedAgentId,
    },
  });
});

agentsHubRouter.post('/tasks/:id/claim', (req, res) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.id);
  const body = req.body as { agentKey?: string };

  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'id da tarefa inválido' });
  }
  if (!body.agentKey?.trim()) {
    return res.status(400).json({ error: 'agentKey é obrigatório para claim' });
  }

  const agent = findAgentByKey(userId, body.agentKey.trim());
  if (!agent) {
    return res.status(404).json({ error: 'Agente não encontrado' });
  }

  const result = db.prepare(`
    UPDATE ai_tasks
    SET
      assigned_agent_id = ?,
      status = 'running',
      started_at = COALESCE(started_at, ?),
      updated_at = ?
    WHERE
      id = ? AND user_id = ?
      AND status IN ('queued', 'blocked')
      AND (assigned_agent_id IS NULL OR assigned_agent_id = ?)
  `).run(agent.id, nowIso(), nowIso(), taskId, userId, agent.id);

  if (!result.changes) {
    return res.status(409).json({ error: 'Tarefa não está disponível para claim' });
  }

  emitHubEvent(userId, 'task.claimed', 'task', taskId, {
    agentKey: agent.agent_key,
    agentId: agent.id,
  });

  return res.json({ ok: true, taskId, status: 'running', agentKey: agent.agent_key });
});

agentsHubRouter.post('/tasks/:id/complete', (req, res) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.id);
  const body = req.body as {
    agentKey?: string;
    resultSummary?: string;
    resultPayload?: JsonRecord;
    reportTitle?: string;
  };

  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'id da tarefa inválido' });
  }

  const task = db.prepare(`
    SELECT *
    FROM ai_tasks
    WHERE id = ? AND user_id = ?
  `).get(taskId, userId) as TaskRow | undefined;

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }
  if (!['queued', 'running', 'blocked'].includes(task.status)) {
    return res.status(409).json({ error: `Tarefa não pode ser concluída a partir de status ${task.status}` });
  }

  let agentId = task.assigned_agent_id;
  if (body.agentKey?.trim()) {
    const agent = findAgentByKey(userId, body.agentKey.trim());
    if (!agent) {
      return res.status(404).json({ error: 'Agente informado não encontrado' });
    }
    agentId = agent.id;
  }

  const summary = body.resultSummary?.trim() || null;
  const payload = body.resultPayload ? JSON.stringify(body.resultPayload) : null;

  db.prepare(`
    UPDATE ai_tasks
    SET
      status = 'done',
      assigned_agent_id = ?,
      result_summary = ?,
      result_payload_json = ?,
      finished_at = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    agentId,
    summary,
    payload,
    nowIso(),
    nowIso(),
    taskId,
    userId,
  );

  let reportId: number | null = null;
  if (summary) {
    const reportInsert = db.prepare(`
      INSERT INTO ai_reports (
        user_id, agent_id, report_type, title, content, metrics_json, created_at
      ) VALUES (?, ?, 'status', ?, ?, ?, ?)
    `).run(
      userId,
      agentId,
      body.reportTitle?.trim() || `Relatório da tarefa #${taskId}`,
      summary,
      payload,
      nowIso(),
    );
    reportId = Number(reportInsert.lastInsertRowid);
    emitHubEvent(userId, 'report.created', 'report', reportId, { taskId });
  }

  if (summary && task.thread_id) {
    const messageInsert = db.prepare(`
      INSERT INTO ai_messages (
        user_id, thread_id, sender_type, sender_agent_id, content, payload_json, status, created_at
      ) VALUES (?, ?, 'agent', ?, ?, ?, 'delivered', ?)
    `).run(
      userId,
      task.thread_id,
      agentId,
      summary,
      payload,
      nowIso(),
    );

    const messageId = Number(messageInsert.lastInsertRowid);
    db.prepare(`
      UPDATE ai_threads
      SET updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(nowIso(), task.thread_id, userId);
    emitHubEvent(userId, 'message.created', 'message', messageId, {
      threadId: task.thread_id,
      fromTask: taskId,
    });
  }

  emitHubEvent(userId, 'task.completed', 'task', taskId, { reportId });
  return res.json({ ok: true, taskId, status: 'done', reportId });
});

agentsHubRouter.post('/tasks/:id/fail', (req, res) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.id);
  const body = req.body as {
    agentKey?: string;
    error?: string;
    title?: string;
    details?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
  };

  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'id da tarefa inválido' });
  }

  const task = db.prepare(`
    SELECT *
    FROM ai_tasks
    WHERE id = ? AND user_id = ?
  `).get(taskId, userId) as TaskRow | undefined;

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  let agentId = task.assigned_agent_id;
  if (body.agentKey?.trim()) {
    const agent = findAgentByKey(userId, body.agentKey.trim());
    if (!agent) {
      return res.status(404).json({ error: 'Agente informado não encontrado' });
    }
    agentId = agent.id;
  }

  const errorText = body.error?.trim() || body.details?.trim() || 'Falha não especificada';
  db.prepare(`
    UPDATE ai_tasks
    SET
      status = 'failed',
      assigned_agent_id = ?,
      result_summary = ?,
      finished_at = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    agentId,
    errorText,
    nowIso(),
    nowIso(),
    taskId,
    userId,
  );

  const severity = body.severity || 'high';
  const failureInsert = db.prepare(`
    INSERT INTO ai_failures (
      user_id, agent_id, task_id, severity, category, title, details, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    userId,
    agentId,
    taskId,
    severity,
    body.category?.trim() || 'execution',
    body.title?.trim() || `Falha na tarefa #${taskId}`,
    body.details?.trim() || errorText,
    nowIso(),
    nowIso(),
  );

  const failureId = Number(failureInsert.lastInsertRowid);
  emitHubEvent(userId, 'task.failed', 'task', taskId, { failureId });
  emitHubEvent(userId, 'failure.created', 'failure', failureId, { taskId });

  return res.status(201).json({ ok: true, taskId, status: 'failed', failureId });
});

agentsHubRouter.patch('/tasks/:id', (req, res) => {
  const userId = req.user!.userId;
  const taskId = Number(req.params.id);
  const body = req.body as {
    status?: 'queued' | 'running' | 'blocked' | 'done' | 'failed' | 'cancelled';
    priority?: 'low' | 'normal' | 'high' | 'critical';
    assignedAgentKey?: string;
    title?: string;
  };

  if (!Number.isFinite(taskId)) {
    return res.status(400).json({ error: 'id da tarefa inválido' });
  }

  const task = db.prepare(`
    SELECT *
    FROM ai_tasks
    WHERE id = ? AND user_id = ?
  `).get(taskId, userId) as TaskRow | undefined;
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const nextStatus = body.status || task.status;
  const nextPriority = body.priority || task.priority;
  let nextAgentId = task.assigned_agent_id;
  if (body.assignedAgentKey !== undefined) {
    if (!body.assignedAgentKey.trim()) {
      nextAgentId = null;
    } else {
      const agent = findAgentByKey(userId, body.assignedAgentKey.trim());
      if (!agent) {
        return res.status(404).json({ error: 'Agente atribuído não encontrado' });
      }
      nextAgentId = agent.id;
    }
  }

  db.prepare(`
    UPDATE ai_tasks
    SET status = ?, priority = ?, assigned_agent_id = ?, title = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    nextStatus,
    nextPriority,
    nextAgentId,
    body.title?.trim() || task.title,
    nowIso(),
    taskId,
    userId,
  );

  emitHubEvent(userId, 'task.updated', 'task', taskId, {
    status: nextStatus,
    priority: nextPriority,
    assignedAgentId: nextAgentId,
  });

  return res.json({ ok: true, taskId, status: nextStatus, priority: nextPriority });
});

agentsHubRouter.get('/failures', (req, res) => {
  const userId = req.user!.userId;
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const severity = typeof req.query.severity === 'string' ? req.query.severity.trim() : '';
  const agentKey = typeof req.query.agentKey === 'string' ? req.query.agentKey.trim() : '';
  const limit = normalizeLimit(req.query.limit, 100, 300);

  let agentId: number | null = null;
  if (agentKey) {
    const agent = findAgentByKey(userId, agentKey);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado para filtro' });
    }
    agentId = agent.id;
  }

  const conditions = ['f.user_id = ?'];
  const params: Array<number | string> = [userId];

  if (status) {
    conditions.push('f.status = ?');
    params.push(status);
  }
  if (severity) {
    conditions.push('f.severity = ?');
    params.push(severity);
  }
  if (agentId !== null) {
    conditions.push('f.agent_id = ?');
    params.push(agentId);
  }

  params.push(limit);
  const rows = db.prepare(`
    SELECT f.*, a.agent_key, a.name AS agent_name
    FROM ai_failures f
    LEFT JOIN ai_agents a ON a.id = f.agent_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY f.id DESC
    LIMIT ?
  `).all(...params) as Array<{
    id: number;
    user_id: number;
    agent_id: number | null;
    task_id: number | null;
    severity: string;
    category: string | null;
    title: string;
    details: string | null;
    status: string;
    root_cause: string | null;
    resolution: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
    agent_key: string | null;
    agent_name: string | null;
  }>;

  return res.json({
    failures: rows.map((failure) => ({
      id: failure.id,
      agent: failure.agent_id ? {
        id: failure.agent_id,
        agentKey: failure.agent_key,
        name: failure.agent_name,
      } : null,
      taskId: failure.task_id,
      severity: failure.severity,
      category: failure.category,
      title: failure.title,
      details: failure.details,
      status: failure.status,
      rootCause: failure.root_cause,
      resolution: failure.resolution,
      createdAt: failure.created_at,
      updatedAt: failure.updated_at,
      resolvedAt: failure.resolved_at,
    })),
  });
});

agentsHubRouter.post('/failures', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    agentKey?: string;
    taskId?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    title?: string;
    details?: string;
  };

  const title = (body.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'title é obrigatório' });
  }

  let agentId: number | null = null;
  if (body.agentKey?.trim()) {
    const agent = findAgentByKey(userId, body.agentKey.trim());
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    agentId = agent.id;
  }

  const severity = body.severity || 'medium';
  const insert = db.prepare(`
    INSERT INTO ai_failures (
      user_id, agent_id, task_id, severity, category, title, details,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(
    userId,
    agentId,
    body.taskId || null,
    severity,
    body.category?.trim() || null,
    title,
    body.details?.trim() || null,
    nowIso(),
    nowIso(),
  );

  const failureId = Number(insert.lastInsertRowid);
  emitHubEvent(userId, 'failure.created', 'failure', failureId, {
    severity,
    agentId,
  });

  return res.status(201).json({
    failure: {
      id: failureId,
      severity,
      status: 'open',
      title,
    },
  });
});

agentsHubRouter.patch('/failures/:id', (req, res) => {
  const userId = req.user!.userId;
  const failureId = Number(req.params.id);
  const body = req.body as {
    status?: 'open' | 'in_progress' | 'resolved' | 'ignored';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    title?: string;
    details?: string;
    rootCause?: string;
    resolution?: string;
  };

  if (!Number.isFinite(failureId)) {
    return res.status(400).json({ error: 'id da falha inválido' });
  }

  const current = db.prepare(`
    SELECT *
    FROM ai_failures
    WHERE id = ? AND user_id = ?
  `).get(failureId, userId) as
    | {
        id: number;
        status: string;
        severity: string;
        category: string | null;
        title: string;
        details: string | null;
        root_cause: string | null;
        resolution: string | null;
      }
    | undefined;

  if (!current) {
    return res.status(404).json({ error: 'Falha não encontrada' });
  }

  const nextStatus = body.status || current.status;
  const nextSeverity = body.severity || current.severity;
  const nextCategory = body.category?.trim() ?? current.category;
  const nextTitle = body.title?.trim() || current.title;
  const nextDetails = body.details?.trim() ?? current.details;
  const nextRootCause = body.rootCause?.trim() ?? current.root_cause;
  const nextResolution = body.resolution?.trim() ?? current.resolution;
  const resolvedAt = nextStatus === 'resolved' ? nowIso() : null;

  db.prepare(`
    UPDATE ai_failures
    SET
      status = ?,
      severity = ?,
      category = ?,
      title = ?,
      details = ?,
      root_cause = ?,
      resolution = ?,
      resolved_at = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    nextStatus,
    nextSeverity,
    nextCategory,
    nextTitle,
    nextDetails,
    nextRootCause,
    nextResolution,
    resolvedAt,
    nowIso(),
    failureId,
    userId,
  );

  emitHubEvent(userId, 'failure.updated', 'failure', failureId, {
    status: nextStatus,
    severity: nextSeverity,
  });

  return res.json({
    failure: {
      id: failureId,
      status: nextStatus,
      severity: nextSeverity,
      category: nextCategory,
      title: nextTitle,
      details: nextDetails,
      rootCause: nextRootCause,
      resolution: nextResolution,
      resolvedAt,
    },
  });
});

agentsHubRouter.get('/reports', (req, res) => {
  const userId = req.user!.userId;
  const reportType = typeof req.query.reportType === 'string' ? req.query.reportType.trim() : '';
  const agentKey = typeof req.query.agentKey === 'string' ? req.query.agentKey.trim() : '';
  const limit = normalizeLimit(req.query.limit, 100, 300);

  let agentId: number | null = null;
  if (agentKey) {
    const agent = findAgentByKey(userId, agentKey);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado para filtro' });
    }
    agentId = agent.id;
  }

  const conditions = ['r.user_id = ?'];
  const params: Array<number | string> = [userId];
  if (reportType) {
    conditions.push('r.report_type = ?');
    params.push(reportType);
  }
  if (agentId !== null) {
    conditions.push('r.agent_id = ?');
    params.push(agentId);
  }

  params.push(limit);
  const rows = db.prepare(`
    SELECT r.*, a.agent_key, a.name AS agent_name
    FROM ai_reports r
    LEFT JOIN ai_agents a ON a.id = r.agent_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.id DESC
    LIMIT ?
  `).all(...params) as Array<{
    id: number;
    agent_id: number | null;
    report_type: string;
    title: string;
    content: string;
    metrics_json: string | null;
    created_at: string;
    agent_key: string | null;
    agent_name: string | null;
  }>;

  return res.json({
    reports: rows.map((report) => ({
      id: report.id,
      agent: report.agent_id ? {
        id: report.agent_id,
        agentKey: report.agent_key,
        name: report.agent_name,
      } : null,
      reportType: report.report_type,
      title: report.title,
      content: report.content,
      metrics: safeJsonParse<JsonRecord | null>(report.metrics_json, null),
      createdAt: report.created_at,
    })),
  });
});

agentsHubRouter.post('/reports', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    agentKey?: string;
    reportType?: string;
    title?: string;
    content?: string;
    metrics?: JsonRecord;
  };

  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  if (!title || !content) {
    return res.status(400).json({ error: 'title e content são obrigatórios' });
  }

  let agentId: number | null = null;
  if (body.agentKey?.trim()) {
    const agent = findAgentByKey(userId, body.agentKey.trim());
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    agentId = agent.id;
  }

  const reportType = body.reportType?.trim() || 'status';
  const insert = db.prepare(`
    INSERT INTO ai_reports (
      user_id, agent_id, report_type, title, content, metrics_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    agentId,
    reportType,
    title,
    content,
    body.metrics ? JSON.stringify(body.metrics) : null,
    nowIso(),
  );

  const reportId = Number(insert.lastInsertRowid);
  emitHubEvent(userId, 'report.created', 'report', reportId, {
    reportType,
    agentId,
  });

  return res.status(201).json({
    report: {
      id: reportId,
      reportType,
      title,
      createdAt: nowIso(),
    },
  });
});

agentsHubRouter.get('/learning', (req, res) => {
  const userId = req.user!.userId;
  const agentKey = typeof req.query.agentKey === 'string' ? req.query.agentKey.trim() : '';
  const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = normalizeLimit(req.query.limit, 100, 300);

  let agentId: number | null = null;
  if (agentKey) {
    const agent = findAgentByKey(userId, agentKey);
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado para filtro' });
    }
    agentId = agent.id;
  }

  const conditions = ['l.user_id = ?'];
  const params: Array<number | string> = [userId];
  if (agentId !== null) {
    conditions.push('l.agent_id = ?');
    params.push(agentId);
  }
  if (topic) {
    conditions.push('l.topic = ?');
    params.push(topic);
  }
  if (q) {
    conditions.push('(l.content LIKE ? OR l.topic LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  params.push(limit);
  const rows = db.prepare(`
    SELECT l.*, a.agent_key, a.name AS agent_name
    FROM ai_learning_entries l
    LEFT JOIN ai_agents a ON a.id = l.agent_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY l.id DESC
    LIMIT ?
  `).all(...params) as Array<{
    id: number;
    agent_id: number | null;
    source: string | null;
    topic: string | null;
    content: string;
    tags_json: string | null;
    created_at: string;
    agent_key: string | null;
    agent_name: string | null;
  }>;

  return res.json({
    entries: rows.map((entry) => ({
      id: entry.id,
      agent: entry.agent_id ? {
        id: entry.agent_id,
        agentKey: entry.agent_key,
        name: entry.agent_name,
      } : null,
      source: entry.source,
      topic: entry.topic,
      content: entry.content,
      tags: safeJsonParse<string[] | null>(entry.tags_json, null),
      createdAt: entry.created_at,
    })),
  });
});

agentsHubRouter.post('/learning', (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as {
    agentKey?: string;
    source?: string;
    topic?: string;
    content?: string;
    tags?: string[];
  };

  const content = (body.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: 'content é obrigatório' });
  }

  let agentId: number | null = null;
  if (body.agentKey?.trim()) {
    const agent = findAgentByKey(userId, body.agentKey.trim());
    if (!agent) {
      return res.status(404).json({ error: 'Agente não encontrado' });
    }
    agentId = agent.id;
  }

  const insert = db.prepare(`
    INSERT INTO ai_learning_entries (
      user_id, agent_id, source, topic, content, tags_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    agentId,
    body.source?.trim() || null,
    body.topic?.trim() || null,
    content,
    Array.isArray(body.tags) ? JSON.stringify(body.tags) : null,
    nowIso(),
  );

  const entryId = Number(insert.lastInsertRowid);
  emitHubEvent(userId, 'learning.created', 'learning', entryId, {
    topic: body.topic?.trim() || null,
    agentId,
  });

  return res.status(201).json({
    entry: {
      id: entryId,
      topic: body.topic?.trim() || null,
      source: body.source?.trim() || null,
      createdAt: nowIso(),
    },
  });
});

agentsHubRouter.get('/events', (req, res) => {
  const userId = req.user!.userId;
  const afterId = req.query.afterId ? Number(req.query.afterId) : 0;
  const limit = normalizeLimit(req.query.limit, 100, 500);

  const rows = db.prepare(`
    SELECT id, event_type, entity_type, entity_id, payload_json, created_at
    FROM ai_events
    WHERE user_id = ? AND id > ?
    ORDER BY id ASC
    LIMIT ?
  `).all(userId, Number.isFinite(afterId) ? afterId : 0, limit) as Array<{
    id: number;
    event_type: string;
    entity_type: string;
    entity_id: number | null;
    payload_json: string | null;
    created_at: string;
  }>;

  return res.json({
    events: rows.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      entityType: event.entity_type,
      entityId: event.entity_id,
      payload: safeJsonParse<JsonRecord | null>(event.payload_json, null),
      createdAt: event.created_at,
    })),
  });
});

agentsHubRouter.get('/stream', (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const queryAfter = req.query.afterId ? Number(req.query.afterId) : 0;
  const headerAfter = req.headers['last-event-id'] ? Number(req.headers['last-event-id']) : 0;
  let cursor = Number.isFinite(queryAfter) && queryAfter > 0 ? queryAfter : headerAfter;
  if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendChunk = (value: string) => {
    res.write(value);
  };

  const pushEvents = () => {
    const rows = db.prepare(`
      SELECT id, event_type, entity_type, entity_id, payload_json, created_at
      FROM ai_events
      WHERE user_id = ? AND id > ?
      ORDER BY id ASC
      LIMIT 200
    `).all(userId, cursor) as Array<{
      id: number;
      event_type: string;
      entity_type: string;
      entity_id: number | null;
      payload_json: string | null;
      created_at: string;
    }>;

    for (const event of rows) {
      cursor = event.id;
      const payload = {
        id: event.id,
        eventType: event.event_type,
        entityType: event.entity_type,
        entityId: event.entity_id,
        payload: safeJsonParse<JsonRecord | null>(event.payload_json, null),
        createdAt: event.created_at,
      };
      sendChunk(`id: ${event.id}\n`);
      sendChunk(`event: ${event.event_type}\n`);
      sendChunk(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  sendChunk(': connected\n\n');
  pushEvents();

  const pollTimer = setInterval(pushEvents, 2000);
  const heartbeatTimer = setInterval(() => {
    sendChunk(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
    res.end();
  });
});

export { agentsHubRouter };
