import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import { AuditLog } from '../models/AuditLog';

export function auditLog(action: string, resource: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        await AuditLog.create({
          agencyId: req.user.agencyId,
          userId: req.user._id,
          action,
          resource,
          resourceId: req.params.id || undefined,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    } catch {
      // Non-blocking — audit failures must not break requests
    }
    next();
  };
}
