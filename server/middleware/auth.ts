import type { NextFunction, Request, Response } from 'express';
import { verifyJwt, type AuthPayload } from '../utils/auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  try {
    const token = authHeader.slice('Bearer '.length);
    req.user = verifyJwt<AuthPayload>(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
