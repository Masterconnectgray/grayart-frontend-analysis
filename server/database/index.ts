import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env, resolveSqlitePath } from '../config/env';

const databasePath = resolveSqlitePath(env.databaseUrl);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS social_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at TEXT,
    account_name TEXT,
    account_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform, account_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS oauth_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS publish_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_at TEXT,
    published_at TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    result TEXT,
    model TEXT NOT NULL,
    tokens_used INTEGER,
    cost_estimate REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    duration_sec REAL,
    format TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    instance_name TEXT NOT NULL,
    template TEXT,
    contacts_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    content TEXT NOT NULL,
    media_asset_id INTEGER,
    scheduled_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    publish_job_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL,
    FOREIGN KEY (publish_job_id) REFERENCES publish_jobs(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS whatsapp_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    last_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agent_key TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    model TEXT,
    provider TEXT,
    avatar TEXT,
    color TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    is_enabled INTEGER NOT NULL DEFAULT 1,
    health_score INTEGER NOT NULL DEFAULT 100,
    metadata_json TEXT,
    last_heartbeat_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, agent_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    thread_key TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'group',
    target_agent_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, thread_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    thread_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL DEFAULT 'user',
    sender_agent_id INTEGER,
    content TEXT NOT NULL,
    payload_json TEXT,
    status TEXT NOT NULL DEFAULT 'delivered',
    error_code TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (thread_id) REFERENCES ai_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    thread_id INTEGER,
    source_message_id INTEGER,
    assigned_agent_id INTEGER,
    title TEXT,
    instruction TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'queued',
    result_summary TEXT,
    result_payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    finished_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (thread_id) REFERENCES ai_threads(id) ON DELETE SET NULL,
    FOREIGN KEY (source_message_id) REFERENCES ai_messages(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_failures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agent_id INTEGER,
    task_id INTEGER,
    severity TEXT NOT NULL DEFAULT 'medium',
    category TEXT,
    title TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    root_cause TEXT,
    resolution TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL,
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agent_id INTEGER,
    report_type TEXT NOT NULL DEFAULT 'status',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metrics_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_learning_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agent_id INTEGER,
    source TEXT,
    topic TEXT,
    content TEXT NOT NULL,
    tags_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS ai_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_ai_agents_user ON ai_agents(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_agents_user_key ON ai_agents(user_id, agent_key);
  CREATE INDEX IF NOT EXISTS idx_ai_threads_user ON ai_threads(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_threads_user_key ON ai_threads(user_id, thread_key);
  CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_messages(thread_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON ai_messages(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_status ON ai_tasks(user_id, status, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_tasks_agent_status ON ai_tasks(assigned_agent_id, status, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_failures_user_status ON ai_failures(user_id, status, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_reports_user ON ai_reports(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_learning_user ON ai_learning_entries(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_events_user ON ai_events(user_id, id DESC);
`);

ensureColumn('scheduled_posts', 'approval_feedback', 'TEXT');
ensureColumn('scheduled_posts', 'approved_at', 'TEXT');
ensureColumn('scheduled_posts', 'changes_requested_at', 'TEXT');

// Seed admin user on startup (password from env var)
import bcrypt from 'bcryptjs';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme-on-first-login';
const adminHash = bcrypt.hashSync(adminPassword, 10);
db.prepare('INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
  'admin@grayart.com',
  adminHash,
  'Administrador GrayArt',
  'admin'
);

export function nowIso(): string {
  return new Date().toISOString();
}
