import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { UnauthorizedError } from '../utils/errors';
import { JwtPayload, AuthRequest } from '../types/express';

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError('No token provided');

    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    const user = await User.findById(payload.userId).select('+refreshTokens');

    if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}
