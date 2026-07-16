import { Request, Response, NextFunction } from 'express';
import {
  RateLimiterMySQL,
  RateLimiterMemory,
  RateLimiterRes,
  RateLimiterAbstract,
} from 'rate-limiter-flexible';
import mysql from 'mysql2';
import { env } from '../config/env';
import { errorResponse } from '../utils/response.util';
import { logger } from '../config/logger';
import { RATE_LIMIT_LOGIN_MAX, RATE_LIMIT_PASSWORD_RESET_MAX } from '../config/constants';

const dbHost: string = env.dbHost;
const dbPort: number = env.dbPort;
const dbUser: string = env.dbUser;
const dbPassword: string = env.dbPassword;
const dbName: string = env.dbName;
const rateLimitMaxRequests: number = env.rateLimitMaxRequests;
const rateLimitWindowMs: number = env.rateLimitWindowMs;
const isTestEnv = env.nodeEnv === 'test';

// Tests should not require live infrastructure just to exercise middleware behavior.
const pool = isTestEnv
  ? null
  : mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ...(env.nodeEnv === 'production' && {
        ssl: { rejectUnauthorized: true },
      }),
    });

const createLimiter = (
  tableName: string,
  points: number,
  duration: number,
  blockDuration: number
): RateLimiterAbstract => {
  if (isTestEnv) {
    return new RateLimiterMemory({
      points,
      duration,
      blockDuration,
    });
  }

  return new RateLimiterMySQL({
    storeClient: pool!,
    dbName,
    tableName,
    points,
    duration,
    blockDuration,
  });
};

// General API rate limiter
const apiLimiter = createLimiter(
  'rate_limits_api',
  rateLimitMaxRequests, // Number of requests
  rateLimitWindowMs / 1000, // Per X seconds
  60 // Block for 1 minute if exceeded
);

// Stricter rate limiter for login attempts (by IP)
const loginIpLimiter = createLimiter(
  'rate_limits_login_ip',
  RATE_LIMIT_LOGIN_MAX, // 10 attempts per NIST SP 800-63B guidance
  15 * 60, // Per 15 minutes
  5 * 60 // Block for 5 minutes
);

// Stricter rate limiter for login attempts (by Email)
const loginEmailLimiter = createLimiter(
  'rate_limits_login_email',
  RATE_LIMIT_LOGIN_MAX, // 10 attempts per NIST SP 800-63B guidance
  15 * 60, // Per 15 minutes
  5 * 60 // Block for 5 minutes
);

// Stricter rate limiter for password reset
const passwordResetLimiter = createLimiter(
  'rate_limits_password_reset',
  RATE_LIMIT_PASSWORD_RESET_MAX, // 5 attempts per hour
  60 * 60, // Per hour
  60 * 60 // Block for 1 hour
);

// Stricter rate limiter for registration
const registrationLimiter = createLimiter(
  'rate_limits_registration',
  5, // 5 attempts
  60 * 60, // Per hour
  60 * 60 // Block for 1 hour
);

const handleRateLimitError = (
  res: Response,
  error: unknown,
  limitType: string,
  ip: string
): void => {
  if (error instanceof Error) {
    logger.warn(`Rate limit error for ${limitType}:`, error.message);
    errorResponse(res, 'Too many requests', 429);
    return;
  }

  const rateLimiterRes = error as RateLimiterRes;
  const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);

  logger.warn(`Rate limit exceeded for ${limitType}:`, {
    ip,
    retryAfter,
  });

  res.setHeader('Retry-After', retryAfter.toString());
  res.setHeader(
    'X-RateLimit-Reset',
    new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
  );

  errorResponse(res, `Too many requests. Please try again in ${retryAfter} seconds.`, 429);
};

const createRateLimitMiddleware = (limiter: RateLimiterAbstract, limitType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Use IP address as key
      const key = req.ip || req.socket.remoteAddress || 'unknown';

      await limiter.consume(key);
      next();
    } catch (error: unknown) {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      handleRateLimitError(res, error, limitType, ip);
    }
  };
};

export const rateLimitMiddleware = createRateLimitMiddleware(apiLimiter, 'API');

export const loginRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email: unknown = (req.body as Record<string, unknown>)?.['email'];

    // Check IP rate limit
    await loginIpLimiter.consume(ip);

    // Check Email rate limit if email is provided
    // Normalize email (trim + lowercase) to prevent whitespace bypass
    if (email && typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      await loginEmailLimiter.consume(normalizedEmail);
    }

    next();
  } catch (error: unknown) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    handleRateLimitError(res, error, 'Login', ip);
  }
};

export const passwordResetRateLimitMiddleware = createRateLimitMiddleware(
  passwordResetLimiter,
  'Password Reset'
);
export const registrationRateLimitMiddleware = createRateLimitMiddleware(
  registrationLimiter,
  'Registration'
);
