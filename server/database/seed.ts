import { db, nowIso } from './index';
import { hashPassword } from '../utils/auth';
import { env } from '../config/env';
import { encrypt } from '../utils/crypto';

type SeedUser = {
  id: number;
  email: string;
  name: string;
};

function isoOffsetDays(days: number, hour = 12, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function truncateTables() {
  db.exec(`
    DELETE FROM whatsapp_approvals;
    DELETE FROM audit_logs;
    DELETE FROM scheduled_posts;
    DELETE FROM whatsapp_campaigns;
    DELETE FROM media_assets;
    DELETE FROM ai_jobs;
    DELETE FROM publish_jobs;
    DELETE FROM social_connections;
  `);
}

async function ensureSeedUser(): Promise<SeedUser> {
  const existing = db.prepare(`
    SELECT id, email, name
    FROM users
    WHERE email = ?
  `).get('admin@grayart.local') as SeedUser | undefined;

  if (existing) return existing;

  const passwordHash = await hashPassword('12345678');
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run('admin@grayart.local', passwordHash, 'Gray Admin', 'user');

  return {
    id: Number(result.lastInsertRowid),
    email: 'admin@grayart.local',
    name: 'Gray Admin',
  };
}

function insertScheduledPosts(userId: number) {
  const rows = [
    {
      platform: 'instagram',
      content: 'Coffee Meet de abril confirmado. 3 motivos para o síndico participar e sair com fornecedores validados. #coffeemeet #connectgray #sindico',
      scheduled_at: isoOffsetDays(2, 18, 0),
      status: 'pending_approval',
      approval_feedback: null,
      approved_at: null,
      changes_requested_at: null,
    },
    {
      platform: 'linkedin',
      content: 'Como reduzir retrabalho em condomínio com networking qualificado entre síndicos, administradoras e parceiros técnicos. #networking #gestaopredial',
      scheduled_at: isoOffsetDays(3, 9, 30),
      status: 'pending_approval',
      approval_feedback: null,
      approved_at: null,
      changes_requested_at: null,
    },
    {
      platform: 'instagram',
      content: 'Antes e depois de uma modernização de elevador que devolveu segurança, estética e previsibilidade de manutenção ao condomínio. #elevadores #grayup',
      scheduled_at: isoOffsetDays(1, 19, 0),
      status: 'pending_approval',
      approval_feedback: null,
      approved_at: null,
      changes_requested_at: null,
    },
    {
      platform: 'instagram',
      content: 'Branding premium não é só logo bonito: é percepção, posicionamento e venda. Case Gray Art para empresa de serviços B2B. #branding #grayart',
      scheduled_at: isoOffsetDays(1, 20, 0),
      status: 'approved',
      approval_feedback: null,
      approved_at: isoOffsetDays(0, 11, 15),
      changes_requested_at: null,
    },
    {
      platform: 'instagram',
      content: 'Reels publicado: 3 erros que fazem o síndico pagar mais caro na manutenção corretiva. #sindico #manutencao #connectgray',
      scheduled_at: isoOffsetDays(-1, 18, 30),
      status: 'published',
      approval_feedback: null,
      approved_at: isoOffsetDays(-2, 16, 0),
      changes_requested_at: null,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO scheduled_posts (
      user_id, platform, content, scheduled_at, status, approval_feedback,
      approved_at, changes_requested_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return rows.map((row) => Number(stmt.run(
    userId,
    row.platform,
    row.content,
    row.scheduled_at,
    row.status,
    row.approval_feedback,
    row.approved_at,
    row.changes_requested_at,
  ).lastInsertRowid));
}

function insertPublishJobs(userId: number) {
  const jobs = [
    ['instagram', 'Publicado: Coffee Meet lotado com 120 síndicos e gestores em São Paulo. #connectgray #coffeemeet', 'published', null, isoOffsetDays(-10, 18, 0), null],
    ['linkedin', 'Publicado: Networking qualificado reduz tempo de contratação e aumenta previsibilidade operacional em condomínios.', 'published', null, isoOffsetDays(-9, 8, 30), null],
    ['instagram', 'Publicado: Antes e depois da modernização de elevador com foco em segurança e valorização do ativo.', 'published', null, isoOffsetDays(-8, 19, 0), null],
    ['instagram', 'Publicado: Rebranding premium para empresa de facilities com ganho imediato de percepção de valor.', 'published', null, isoOffsetDays(-7, 20, 0), null],
    ['youtube', 'Publicado: Tour técnico mostrando etapas da modernização completa de elevadores.', 'published', null, isoOffsetDays(-6, 12, 0), null],
    ['instagram', 'Fila: roteiro sobre 3 dicas para síndicos reduzirem custos ocultos.', 'pending', isoOffsetDays(1, 18, 0), null, null],
    ['linkedin', 'Fila: artigo sobre ROI de branding em vendas consultivas B2B.', 'pending', isoOffsetDays(2, 9, 0), null, null],
    ['instagram', 'Fila: bastidores da criação de identidade visual Gray Art.', 'pending', isoOffsetDays(3, 20, 0), null, null],
    ['tiktok', 'Falhou: trend de elevadores com humor técnico.', 'failed', isoOffsetDays(-2, 19, 0), null, 'Conta social desconectada'],
    ['facebook', 'Falhou: convite para Coffee Meet regional.', 'failed', isoOffsetDays(-1, 17, 0), null, 'HTTP 502 Flow social publish'],
  ] as const;

  const stmt = db.prepare(`
    INSERT INTO publish_jobs (
      user_id, platform, content, status, scheduled_at, published_at, error_message, retry_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [platform, content, status, scheduledAt, publishedAt, errorMessage] of jobs) {
    stmt.run(
      userId,
      platform,
      content,
      status,
      status === 'pending' ? scheduledAt : scheduledAt,
      status === 'published' ? publishedAt : null,
      errorMessage,
      status === 'failed' ? 1 : 0,
    );
  }
}

function insertAiJobs(userId: number) {
  const jobs = [
    {
      type: 'copy',
      prompt: 'Crie um roteiro para Instagram da Connect Gray promovendo o próximo Coffee Meet com foco em autoridade para síndicos.',
      result: {
        hook: 'O networking certo muda a rotina do síndico.',
        body: 'No próximo Coffee Meet, síndicos e administradoras se conectam com fornecedores validados e soluções reais para reduzir ruído operacional.',
        cta: 'Confirme sua presença no próximo encontro.',
      },
      model: 'gemini-2.5-flash',
    },
    {
      type: 'copy',
      prompt: 'Crie uma copy para Gray Up mostrando antes e depois de modernização de elevadores em condomínio alto padrão.',
      result: {
        hook: 'Seu elevador comunica segurança ou descuido?',
        body: 'Modernização bem executada melhora a percepção do condomínio, reduz parada e traz previsibilidade de manutenção.',
        cta: 'Peça uma avaliação técnica.',
      },
      model: 'gemini-2.5-flash',
    },
    {
      type: 'copy',
      prompt: 'Crie uma copy da Gray Art para LinkedIn sobre branding premium gerar valor percebido e conversão.',
      result: {
        hook: 'Branding não é custo. É margem.',
        body: 'Marcas bem posicionadas encurtam objeções e aumentam a confiança em vendas consultivas.',
        cta: 'Veja nossos cases.',
      },
      model: 'gemini-2.5-flash',
    },
    {
      type: 'video_prompt',
      prompt: 'Gere prompt cinematográfico em inglês para vídeo da Connect Gray em evento Coffee Meet.',
      result: {
        prompt: 'Business networking event in a modern venue, condo managers greeting suppliers, warm cinematic lighting, handheld camera movement, premium corporate atmosphere, vertical 9:16.',
      },
      model: 'gemini-2.5-flash',
    },
    {
      type: 'video_prompt',
      prompt: 'Gere prompt cinematográfico em inglês para vídeo da Gray Up mostrando modernização de elevadores.',
      result: {
        prompt: 'Technicians modernizing an elevator in a luxury building, close-up on panels and cables, industrial elegance, cinematic blue lighting, crisp professional movement, vertical 9:16.',
      },
      model: 'gemini-2.5-flash',
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO ai_jobs (
      user_id, type, prompt, result, model, tokens_used, cost_estimate, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
  `);

  for (const job of jobs) {
    stmt.run(
      userId,
      job.type,
      job.prompt,
      JSON.stringify(job.result),
      job.model,
      420,
      0.0021,
      nowIso(),
      nowIso(),
    );
  }
}

function insertWhatsappCampaigns(userId: number) {
  const campaigns = [
    {
      instance_name: 'gray-connect-main',
      template: 'Convite Coffee Meet abril',
      contacts_json: JSON.stringify([
        { name: 'Carlos Síndico', phone: '5511991112222' },
        { name: 'Mariana Gestora', phone: '5511983334444' },
        { name: 'Eduardo Administrador', phone: '5511975556666' },
      ]),
      status: 'sent',
      sent_count: 3,
      failed_count: 0,
      created_at: isoOffsetDays(-2, 10, 0),
    },
    {
      instance_name: 'gray-art-sales',
      template: 'Prévia da semana Gray Art',
      contacts_json: JSON.stringify([
        { name: 'Fernanda Marketing', phone: '5511967778888' },
        { name: 'Paulo Comercial', phone: '5511959990000' },
      ]),
      status: 'scheduled',
      sent_count: 0,
      failed_count: 0,
      created_at: isoOffsetDays(1, 9, 0),
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO whatsapp_campaigns (
      user_id, instance_name, template, contacts_json, status, sent_count, failed_count, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const campaign of campaigns) {
    stmt.run(
      userId,
      campaign.instance_name,
      campaign.template,
      campaign.contacts_json,
      campaign.status,
      campaign.sent_count,
      campaign.failed_count,
      campaign.created_at,
    );
  }
}

function insertSocialConnection(userId: number) {
  db.prepare(`
    INSERT INTO social_connections (
      user_id, platform, access_token_encrypted, refresh_token_encrypted,
      expires_at, account_name, account_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    'instagram',
    encrypt('fake-instagram-access-token', env.jwtSecret),
    encrypt('fake-instagram-refresh-token', env.jwtSecret),
    isoOffsetDays(30, 12, 0),
    '@grupo.gray.teste',
    'ig-test-001',
    nowIso(),
    nowIso(),
  );
}

function insertWhatsappApprovals(userId: number, postIds: number[]) {
  const stmt = db.prepare(`
    INSERT INTO whatsapp_approvals (
      user_id, post_id, phone, instance_name, status, last_message, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(userId, postIds[0], '5511991112222', 'gray-connect-main', 'pending', 'Reel pronto. Responda 1 para aprovar, 2 para alterar.', nowIso());
  stmt.run(userId, postIds[1], '5511983334444', 'gray-connect-main', 'pending', 'Reel pronto. Responda 1 para aprovar, 2 para alterar.', nowIso());
}

async function main() {
  const user = await ensureSeedUser();
  truncateTables();

  const postIds = insertScheduledPosts(user.id);
  insertPublishJobs(user.id);
  insertAiJobs(user.id);
  insertWhatsappCampaigns(user.id);
  insertSocialConnection(user.id);
  insertWhatsappApprovals(user.id, postIds);

  console.log('Seed concluído com sucesso.');
  console.log(`Usuário: ${user.email}`);
  console.log('Dados inseridos:');
  console.log('- 5 scheduled_posts');
  console.log('- 10 publish_jobs');
  console.log('- 5 ai_jobs');
  console.log('- 2 whatsapp_campaigns');
  console.log('- 1 social_connection fake');
}

await main();
