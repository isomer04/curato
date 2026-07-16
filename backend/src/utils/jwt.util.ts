/**
 * JWT (JSON Web Token) Utility
 *
 * Provides functions for generating and verifying JWT tokens.
 * Uses a dual-token strategy with short-lived access tokens and
 * longer-lived refresh tokens for enhanced security.
 *
 * Token Strategy:
 * - Access Token: Short-lived (15 min default), contains user identity
 * - Refresh Token: Longer-lived (7 days default), used to get new access tokens
 *
 * Security Notes:
 * - Access tokens should be stored in memory only
 * - Refresh tokens can be stored in httpOnly cookies
 * - Always verify token signature and claims
 * - Implement token revocation for logout/security events
 */
import jwt, { SignOptions, JwtPayload as JwtLibPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types/express-augment';
import { UserRole } from '../types/constants';

const jwtSecret: string = env.jwtSecret;
const jwtExpiresIn: string = env.jwtExpiresIn;
const jwtRefreshSecret: string = env.jwtRefreshSecret;
const jwtRefreshExpiresIn: string = env.jwtRefreshExpiresIn;
const mfaTokenSecret: string = env.mfaTokenSecret;

/**
 * JWT issuer identifier.
 * Used to verify tokens were issued by this application.
 */
const JWT_ISSUER = 'healthcare-api';

/**
 * JWT audience identifier.
 * Specifies the intended recipient of the token.
 */
const JWT_AUDIENCE = 'healthcare-web';

/**
 * Token pair containing both access and refresh tokens.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate an access token for authenticated API requests.
 *
 * The access token contains:
 * - userId: Unique user identifier
 * - email: User's email address
 * - role: User's role for authorization
 *
 * @param userId - Unique user identifier
 * @param email - User's email address
 * @param role - User's role (patient, doctor, admin)
 * @returns Signed JWT access token
 *
 * @example
 * const token = generateAccessToken(user.id, user.email, user.role);
 * res.json({ accessToken: token });
 */
export const generateAccessToken = (userId: string, email: string, role: UserRole): string => {
  const payload: JwtPayload = {
    userId,
    email,
    role,
  };

  const options: SignOptions = {
    expiresIn: jwtExpiresIn as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  return jwt.sign(payload, jwtSecret, options);
};

/**
 * Generate a refresh token for obtaining new access tokens.
 *
 * Refresh tokens:
 * - Have longer expiration than access tokens
 * - Only contain minimal identifying information
 * - Should be stored securely (httpOnly cookie)
 *
 * @param userId - Unique user identifier
 * @returns Signed JWT refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  const payload = {
    userId,
    type: 'refresh', // Token type to prevent access token misuse
  };

  const options: SignOptions = {
    expiresIn: jwtRefreshExpiresIn as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  return jwt.sign(payload, jwtRefreshSecret, options);
};

/**
 * Generate a short-lived token for MFA verification step.
 */
export const generateMfaToken = (userId: string): string => {
  const payload = {
    userId,
    type: 'mfa',
  };

  const options: SignOptions = {
    expiresIn: '5m', // 5 minutes to complete MFA
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  return jwt.sign(payload, mfaTokenSecret, options);
};

/**
 * Generate both access and refresh tokens for a user.
 *
 * Use this function during login to provide the user with
 * a complete token pair for authentication.
 *
 * @param userId - Unique user identifier
 * @param email - User's email address
 * @param role - User's role
 * @returns Object containing both tokens
 *
 * @example
 * const tokens = generateTokenPair(user.id, user.email, user.role);
 * res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true });
 * res.json({ accessToken: tokens.accessToken });
 */
export const generateTokenPair = (userId: string, email: string, role: UserRole): TokenPair => {
  return {
    accessToken: generateAccessToken(userId, email, role),
    refreshToken: generateRefreshToken(userId),
  };
};

/**
 * Verify and decode an access token.
 *
 * Validates:
 * - Token signature using the secret key
 * - Token expiration
 * - Issuer and audience claims
 *
 * @param token - JWT access token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 *
 * @example
 * try {
 *   const payload = verifyAccessToken(authHeader.split(' ')[1]);
 *   req.user = payload;
 * } catch (error) {
 *   res.status(401).json({ message: 'Unauthorized' });
 * }
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, jwtSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
    return decoded;
  } catch {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify and decode a refresh token.
 *
 * Additional validation ensures the token type is 'refresh'
 * to prevent access tokens from being used as refresh tokens.
 *
 * @param token - JWT refresh token to verify
 * @returns Object containing the user ID
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, jwtRefreshSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtLibPayload & { userId: string; type: string };

    // Verify this is actually a refresh token
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return { userId: decoded.userId };
  } catch {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Verify and decode an MFA token.
 */
export const verifyMfaToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, mfaTokenSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtLibPayload & { userId: string; type: string };

    if (decoded.type !== 'mfa') {
      throw new Error('Invalid token type');
    }

    return { userId: decoded.userId };
  } catch {
    throw new Error('Invalid or expired MFA token');
  }
};

/**
 * Decode a token without verifying its signature.
 *
 * WARNING: This does NOT verify the token. Only use for:
 * - Extracting claims from an already-verified token
 * - Debugging/logging purposes
 * - Pre-verification checks (e.g., checking expiration before making API calls)
 *
 * @param token - JWT token to decode
 * @returns Decoded payload or null if decoding fails
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * Get the expiration date of a token.
 *
 * Useful for client-side token refresh scheduling.
 *
 * @param token - JWT token
 * @returns Expiration date or null if token has no expiration
 */
export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (decoded?.exp) {
    // exp claim is in seconds, convert to milliseconds
    return new Date(decoded.exp * 1000);
  }
  return null;
};

/**
 * Check if a token is expired.
 *
 * @param token - JWT token to check
 * @returns True if token is expired, false otherwise
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return new Date() > expiration;
};
