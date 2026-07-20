import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'pending';
}

export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
  return jwt.verify(token, secret) as AuthPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AuthPayload;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Se requiere rol de administrador' });
    return;
  }
  next();
}
