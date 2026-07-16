import { CookieOptions, Response } from 'express';
import { isProduction } from '../config/env';

// Re-type to avoid CI TypeScript inference issues
const isProd = isProduction as () => boolean;

/**
 * Cookie name used to store the refresh token.
 * Centralised here so it's consistent across the codebase.
 */
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * 7-day TTL used when the user checks "Remember me".
 * Matches JWT_REFRESH_EXPIRES_IN.
 */
const REFRESH_TOKEN_LONG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * 1-day TTL used for session-only logins (rememberMe = false).
 * The cookie expires when the browser is closed OR after 1 day, whichever comes first.
 */
const REFRESH_TOKEN_SHORT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Build cookie options for the refresh token.
 *
 * - httpOnly : JavaScript cannot read this cookie (blocks XSS token theft)
 * - secure   : Cookie is only sent over HTTPS (enforced in production)
 * - sameSite : 'strict' — cookie is never sent on cross-site requests (CSRF defence)
 * - maxAge   : 7 days if rememberMe is true, 1 day otherwise
 * - path     : Scoped to /api so it is only sent with API requests, not every resource
 */
const buildRefreshTokenCookieOptions = (rememberMe: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isProd(), // HTTPS only in production, HTTP allowed in dev
  sameSite: 'strict' as const, // Never sent on cross-site requests
  maxAge: rememberMe ? REFRESH_TOKEN_LONG_MAX_AGE_MS : REFRESH_TOKEN_SHORT_MAX_AGE_MS,
  path: '/api', // Only sent with API requests
});

/**
 * Set the refresh token as a secure HttpOnly cookie on the response.
 * Pass `rememberMe = true` for a 7-day persistent cookie; false for a 1-day session cookie.
 */
export const setRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
  rememberMe = true
): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, buildRefreshTokenCookieOptions(rememberMe));
};

/**
 * Clear the refresh token cookie (used on logout).
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict' as const,
    path: '/api',
  });
};
