import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header', code: 'UNAUTHORIZED' });
    }

    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Missing JWT_SECRET in backend configuration', code: 'SERVER_ERROR' });
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    req.userId = decoded.sub;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
    }
    next();
  };
}
