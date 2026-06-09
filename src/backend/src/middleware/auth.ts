import { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  userDepartment?: string;
  userUnit?: string;
}

const ROLE_ALIASES: Record<string, string> = {
  consultant: 'consultant_doctor',
  intern: 'intern_doctor',
  assistant_registrar: 'assistant_registrar',
  assistant_professor: 'assistant_professor',
  associate_professor: 'associate_professor',
  doctor: 'doctor',
  staff: 'staff',
  reception: 'reception',
  medical_officer: 'medical_officer',
  nurse: 'nurse',
  admin: 'admin',
  patient: 'patient',
};

function normalizeRole(role?: string): string | undefined {
  if (!role) return undefined;
  return ROLE_ALIASES[role] ?? role;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header', code: 'UNAUTHORIZED' });
    }

    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, jwtSecret as jwt.Secret) as JwtPayload;

    req.userId = decoded.sub as string | undefined;
    req.userRole = normalizeRole(decoded.role as string | undefined);
    req.userDepartment = typeof decoded.department === 'string' ? decoded.department : undefined;
    req.userUnit = typeof decoded.unit === 'string' ? decoded.unit : undefined;

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
