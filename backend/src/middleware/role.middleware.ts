import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/constants';
import { forbiddenResponse, unauthorizedResponse } from '../utils/response.util';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorizedResponse(res, 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      forbiddenResponse(res, `Access denied. Required role(s): ${allowedRoles.join(', ')}`);
      return;
    }

    next();
  };
};

// Convenience middleware for specific roles
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireDoctor = requireRole(UserRole.DOCTOR);
export const requirePatient = requireRole(UserRole.PATIENT);
export const requireDoctorOrAdmin = requireRole(UserRole.DOCTOR, UserRole.ADMIN);
export const requirePatientOrAdmin = requireRole(UserRole.PATIENT, UserRole.ADMIN);
export const requireAuthenticated = requireRole(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN);
