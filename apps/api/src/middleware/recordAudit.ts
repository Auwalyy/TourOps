import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuditLog } from '../models/AuditLog';
import { JwtPayload } from '../types/express';
import { logger } from '../utils/logger';

/**
 * Records every successful change, for the audit trail and the dashboard's
 * recent-activity panel.
 *
 * Applied once at the app level rather than route by route: the per-route
 * `auditLog()` helper was never actually attached to anything, which left the
 * activity panel permanently empty in production. Doing it globally means a
 * new route cannot forget to be audited.
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Noise, or things logged more meaningfully elsewhere. */
const SKIP = [/^\/auth\/refresh/, /^\/subscription\/webhook/, /^\/notifications/];

/** Sub-paths worth naming precisely instead of a bare create/update. */
const NAMED_ACTIONS: Record<string, string> = {
  approve: 'approve',
  reject: 'reject',
  verify: 'verify',
  complete: 'complete',
  cancel: 'cancel',
  deactivate: 'deactivate',
  archive: 'archive',
  status: 'status_change',
  invite: 'invite',
  merge: 'merge',
  suspend: 'suspend',
  login: 'login',
  logout: 'logout',
  refund: 'refund',
};

function deriveAction(method: string, segments: string[]): string {
  const last = segments[segments.length - 1];
  if (last && NAMED_ACTIONS[last]) return NAMED_ACTIONS[last];
  if (method === 'POST') return 'create';
  if (method === 'DELETE') return 'delete';
  return 'update';
}

export function recordAudit(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) return next();

  const path = req.path;
  if (SKIP.some((re) => re.test(path))) return next();

  // Log after the response, and only if the change actually succeeded.
  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    try {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ')
        ? header.substring(7)
        : (req as any).cookies?.accessToken;
      if (!token) return;

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      } catch {
        return;
      }
      if (!payload.agencyId || !payload.userId) return;

      const segments = path.split('/').filter(Boolean);
      const resource = segments[0] || 'unknown';
      const rawId = req.params?.id || segments.find((s) => mongoose.isValidObjectId(s));

      void AuditLog.create({
        agencyId: payload.agencyId,
        userId: payload.userId,
        action: deriveAction(req.method, segments),
        resource,
        resourceId: rawId && mongoose.isValidObjectId(rawId) ? rawId : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch((e) => logger.warn(`Audit write failed for ${req.method} ${path}: ${e.message}`));
    } catch {
      // Auditing must never affect the request it is recording.
    }
  });

  next();
}
