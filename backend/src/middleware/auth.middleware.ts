import { Request, Response, NextFunction } from 'express';
import { OptionallyAuthenticatedRequest } from '../types/express-augment';
import { verifyAccessToken } from '../utils/jwt.util';
import { unauthorizedResponse } from '../utils/response.util';
import { logger } from '../config/logger';
import { User } from '../models';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      unauthorizedResponse(res, 'No authorization header provided');
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      unauthorizedResponse(res, 'Invalid authorization header format');
      return;
    }

    const token = parts[1];

    try {
      const decoded = verifyAccessToken(token);

      // Verify the user still exists and is active
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'email', 'role', 'isActive'],
      });

      if (!user) {
        unauthorizedResponse(res, 'User not found');
        return;
      }

      if (!user.isActive) {
        unauthorizedResponse(res, 'Account is deactivated');
        return;
      }

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn('Token verification failed:', msg);
      unauthorizedResponse(res, 'Invalid or expired token');
      return;
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Auth middleware error:', msg);
    unauthorizedResponse(res, 'Authentication failed');
    return;
  }
};

/**
 * Optional auth: attaches `req.user` from a valid JWT when present, but never returns 401.
 *
 * Unlike {@link authMiddleware}, this does **not** load the user from the database, so a
 * deactivated account or deleted user may still appear authenticated until the token expires.
 * Use {@link authMiddleware} for mutations, PHI, or any route that must reflect live account status.
 */
export const optionalAuthMiddleware = (
  req: OptionallyAuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    } catch {
      // Token is invalid, but we continue without user info
    }

    next();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Optional auth middleware error:', msg);
    next();
  }
};
