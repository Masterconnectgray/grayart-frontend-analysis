import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { env } from '../config/env';
import { db } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { publishScheduledPost } from '../utils/publishing';

const whatsappRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

async function evolutionFetch(path: string, options: RequestInit = {}) {
  return fetch(`${env.evolutionApiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.evolutionApiKey,
      ...(options.headers || {}),
    },
  });
}

function parseContactsCsv(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split(/[;,]/).map((item) => item.trim().toLowerCase());
  const numberIndex = headers.findIndex((item) => ['phone', 'telefone', 'numero', 'number'].includes(item));
  const nameIndex = headers.findIndex((item) => ['name', 'nome'].includes(item));

  return lines.slice(1).map((line) => {
    const cols = line.split(/[;,]/).map((item) => item.trim());
    return {
      name: nameIndex >= 0 ? cols[nameIndex] || '' : '',
      phone: numberIndex >= 0 ? cols[numberIndex] || cols[0] || '' : cols[0] || '',
    };
  }).filter((item) => item.phone);
}

function parseContactsXlsx(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
  return rows.map((row) => {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
    );

    const phone = String(
      normalized.phone ||
      normalized.telefone ||
      normalized.numero ||
      normalized.number ||
      ''
    ).trim();

    const name = String(
      normalized.name ||
      normalized.nome ||
      ''
    ).trim();

    return { name, phone };
  }).filter((item) => item.phone);
}

whatsappRouter.post('/webhook', async (req, res) => {
  // Validar webhook secret (se configurado)
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
    return res.status(403).json({ error: 'Webhook não autorizado' });
  }

  const body = req.body as {
    data?: {
      key?: { remoteJid?: string };
      message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    };
  };

  const rawPhone = body.data?.key?.remoteJid || '';
  const phone = rawPhone.split('@')[0];
  const messageText = (body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '').trim();

  if (!phone || !messageText) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const approval = db.prepare(`
    SELECT id, user_id, post_id, phone, instance_name, status
    FROM whatsapp_approvals
    WHERE phone = ? AND status = 'pending'
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 1
  `).get(phone) as
    | { id: number; user_id: number; post_id: number; phone: string; instance_name: string; status: string }
    | undefined;

  if (!approval) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  if (messageText === '1') {
    const post = db.prepare(`
      SELECT id, scheduled_at
      FROM scheduled_posts
      WHERE id = ? AND user_id = ?
    `).get(approval.post_id, approval.user_id) as { id: number; scheduled_at: string | null } | undefined;

    if (!post) {
      return res.status(404).json({ error: 'Post vinculado à aprovação não encontrado' });
    }

    const hasSchedule = !!post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now();
    db.prepare(`
      UPDATE scheduled_posts
      SET status = ?, approved_at = ?, approval_feedback = NULL
      WHERE id = ?
    `).run(hasSchedule ? 'approved' : 'processing', new Date().toISOString(), approval.post_id);

    db.prepare(`
      UPDATE whatsapp_approvals
      SET status = 'approved', last_message = ?, responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(messageText, approval.id);

    logAudit({
      userId: approval.user_id,
      action: 'whatsapp.webhook_approved',
      details: { post_id: approval.post_id, phone, hasSchedule },
      ipAddress: req.ip,
    });

    if (!hasSchedule) {
      await publishScheduledPost(approval.post_id);
    }

    return res.json({ ok: true, approved: true, queued: hasSchedule });
  }

  if (messageText === '2') {
    db.prepare(`
      UPDATE whatsapp_approvals
      SET status = 'changes_requested', last_message = ?, responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(messageText, approval.id);

    db.prepare(`
      UPDATE scheduled_posts
      SET status = 'changes_requested', changes_requested_at = CURRENT_TIMESTAMP, approval_feedback = ?
      WHERE id = ?
    `).run('Alteração solicitada via WhatsApp', approval.post_id);

    logAudit({
      userId: approval.user_id,
      action: 'whatsapp.webhook_changes_requested',
      details: { post_id: approval.post_id, phone },
      ipAddress: req.ip,
    });

    return res.json({ ok: true, approved: false, changesRequested: true });
  }

  return res.status(200).json({ ok: true, ignored: true });
});

whatsappRouter.use(verifyToken);


whatsappRouter.get('/instances', async (req, res) => {
  try {
    const url = env.evolutionApiUrl + '/instance/fetchInstances';
    const response = await fetch(url, {
      headers: { apikey: env.evolutionApiKey },
    });
    if (!response.ok) return res.json({ instances: [] });
    const data = await response.json();
    return res.json({ instances: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.json({ instances: [] });
  }
});whatsappRouter.post('/create-instance', async (req, res) => {
  const { instanceName } = req.body as { instanceName?: string };
  if (!instanceName) {
    return res.status(400).json({ error: 'instanceName é obrigatório' });
  }

  const response = await evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({ instanceName, qrcode: true }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({ error: (data as { message?: string }).message || 'Erro ao criar instância' });
  }

  logAudit({ userId: req.user!.userId, action: 'whatsapp.create_instance', details: { instanceName }, ipAddress: req.ip });
  return res.status(201).json(data);
});

whatsappRouter.get('/qrcode/:instance', async (req, res) => {
  const response = await evolutionFetch(`/instance/connect/${req.params.instance}`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({ error: (data as { message?: string }).message || 'Erro ao obter QR code' });
  }

  return res.json({
    instance: req.params.instance,
    rawData: (data as { code?: string; qrcode?: { code?: string } }).code || (data as { qrcode?: { code?: string } }).qrcode?.code || null,
    base64Image: (data as { base64?: string; qrcode?: { base64?: string } }).base64 || (data as { qrcode?: { base64?: string } }).qrcode?.base64 || null,
    pairingCode: (data as { pairingCode?: string }).pairingCode || null,
  });
});

whatsappRouter.get('/status/:instance', async (req, res) => {
  const response = await evolutionFetch(`/instance/connectionState/${req.params.instance}`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({ error: (data as { message?: string }).message || 'Erro ao consultar status' });
  }

  return res.json(data);
});

whatsappRouter.delete('/instance/:instance', async (req, res) => {
  const response = await evolutionFetch(`/instance/logout/${req.params.instance}`, { method: 'DELETE' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({ error: (data as { message?: string }).message || 'Erro ao desconectar instância' });
  }

  logAudit({ userId: req.user!.userId, action: 'whatsapp.logout_instance', details: { instance: req.params.instance }, ipAddress: req.ip });
  return res.status(204).end();
});

whatsappRouter.post('/send', async (req, res) => {
  const { instance, number, text, image, video } = req.body as {
    instance?: string;
    number?: string;
    text?: string;
    image?: string;
    video?: string;
  };

  if (!instance || !number) {
    return res.status(400).json({ error: 'instance e number são obrigatórios' });
  }


  // Verificar se instancia esta conectada antes de enviar (evita timeout)
  try {
    const stateResp = await evolutionFetch("/instance/connectionState/" + instance, { method: "GET" });
    const stateData = await stateResp.json().catch(() => ({})) as { instance?: { state?: string } };
    const connState = (stateData as any)?.instance?.state;
    if (connState !== "open") {
      return res.status(400).json({
        error: "Instancia nao conectada. Escaneie o QR Code primeiro.",
        state: connState || "unknown",
        instance,
      });
    }
  } catch { /* se nao conseguir verificar, tenta enviar */ }

  const isMedia = Boolean(image || video);
  const endpoint = isMedia ? `/message/sendMedia/${instance}` : `/message/sendText/${instance}`;
  const body = isMedia
    ? { number, mediatype: image ? 'image' : 'video', media: image || video, caption: text || '' }
    : { number, textMessage: { text: text || '' } };

  const response = await evolutionFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({ error: (data as { message?: string }).message || 'Erro ao enviar mensagem' });
  }

  logAudit({ userId: req.user!.userId, action: 'whatsapp.send', details: { instance, number, isMedia }, ipAddress: req.ip });
  return res.json(data);
});

whatsappRouter.post('/broadcast', async (req, res) => {
  const { instance, contacts, template } = req.body as {
    instance?: string;
    contacts?: Array<{ name?: string; phone: string }>;
    template?: string;
  };

  if (!instance || !contacts?.length || !template) {
    return res.status(400).json({ error: 'instance, contacts e template são obrigatórios' });
  }

  const campaign = db.prepare(`
    INSERT INTO whatsapp_campaigns (user_id, instance_name, template, contacts_json, status)
    VALUES (?, ?, ?, ?, 'processing')
  `).run(req.user!.userId, instance, template, JSON.stringify(contacts));

  const campaignId = Number(campaign.lastInsertRowid);
  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    try {
      const response = await evolutionFetch(`/message/sendText/${instance}`, {
        method: 'POST',
        body: JSON.stringify({
          number: contact.phone,
          textMessage: { text: template.replace(/\{\{name\}\}/g, contact.name || '') },
        }),
      });

      if (!response.ok) {
        failedCount += 1;
      } else {
        sentCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  db.prepare(`
    UPDATE whatsapp_campaigns
    SET status = ?, sent_count = ?, failed_count = ?
    WHERE id = ?
  `).run(failedCount > 0 ? 'partial' : 'sent', sentCount, failedCount, campaignId);

  logAudit({ userId: req.user!.userId, action: 'whatsapp.broadcast', details: { instance, campaignId, contacts: contacts.length }, ipAddress: req.ip });
  return res.json({ campaign_id: campaignId, sent_count: sentCount, failed_count: failedCount });
});

whatsappRouter.post('/import-contacts', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo é obrigatório' });
  }

  const ext = req.file.originalname.toLowerCase();
  const contacts = ext.endsWith('.xlsx') || ext.endsWith('.xls')
    ? parseContactsXlsx(req.file.buffer)
    : parseContactsCsv(req.file.buffer.toString('utf8'));

  logAudit({ userId: req.user!.userId, action: 'whatsapp.import_contacts', details: { total: contacts.length }, ipAddress: req.ip });
  return res.json({ contacts });
});



// Alias /qr/:instance → redireciona para /qrcode/:instance (compatibilidade)
whatsappRouter.get('/qr/:instance', async (req, res) => {
  try {
    const response = await evolutionFetch('/instance/connect/' + req.params.instance, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: (data as { message?: string }).message || 'Erro ao obter QR code' });
    }
    return res.json({
      instance: req.params.instance,
      rawData: (data as any).code || (data as any).qrcode?.code || null,
      base64Image: (data as any).base64 || (data as any).qrcode?.base64 || null,
      pairingCode: (data as any).pairingCode || null,
    });
  } catch (error) {
    return res.status(502).json({ error: 'Erro ao conectar com Evolution API' });
  }
});

// ─── Catch-all proxy: encaminha rotas nativas da Evolution API ──────────────
// O frontend usa paths como /instance/connect/, /instance/connectionState/,
// /message/sendText/ que são paths nativos da Evolution API.
// Este catch-all encaminha qualquer rota não mapeada acima.
whatsappRouter.use(async (req, res) => {
  try {
    const targetPath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
    const url = env.evolutionApiUrl + '/' + targetPath;
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        apikey: env.evolutionApiKey,
      },
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }
    
    const text = await response.text();
    return res.status(response.status).send(text);
  } catch (error) {
    return res.status(502).json({ error: 'Erro ao conectar com Evolution API: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

export { whatsappRouter };
