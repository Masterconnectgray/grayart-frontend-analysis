import { Router } from 'express';
import { db } from '../database';
import { verifyToken } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { comparePassword, hashPassword, signToken } from '../utils/auth';

const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'email e password são obrigatórios' });
  }

  const user = db.prepare(`
    SELECT id, email, password_hash, name, role
    FROM users
    WHERE email = ?
  `).get(email) as
    | { id: number; email: string; password_hash: string; name: string; role: string }
    | undefined;

  if (!user || !(await comparePassword(password, user.password_hash))) {
    logAudit({ action: 'auth.login_failed', details: { email }, ipAddress: req.ip });
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  logAudit({ userId: user.id, action: 'auth.login', details: { email }, ipAddress: req.ip });

  return res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'name, email e password são obrigatórios' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    return res.status(409).json({ error: 'Usuário já existe' });
  }

  const passwordHash = await hashPassword(password);
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run(email, passwordHash, name, 'user');

  const userId = Number(result.lastInsertRowid);
  const token = signToken({ userId, email, role: 'user' });
  logAudit({ userId, action: 'auth.register', details: { email }, ipAddress: req.ip });

  return res.status(201).json({
    token,
    user: { id: userId, email, name, role: 'user' },
  });
});

authRouter.get('/me', verifyToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, role, created_at
    FROM users
    WHERE id = ?
  `).get(req.user!.userId);

  return res.json({ user });
});

export { authRouter };
