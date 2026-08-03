import { Response, NextFunction } from 'express';
import { ROLE_PERMISSIONS, Permission } from '../types/roles';
import { ForbiddenError } from '../utils/errors';
import { AuthRequest } from '../types/express';

export function authorize(...permissions: Permission[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new ForbiddenError());
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasPermission = permissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError('Access denied for your role'));
      return;
    }
    next();
  };
}
