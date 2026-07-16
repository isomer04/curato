/**
 * jwt.util.spec.ts
 * Unit tests for JWT token generation and verification utilities.
 *
 * Mocks the env module to supply stable secrets so that tokens generated
 * in one test can be verified in the same test without touching the real
 * .env file.
 */

jest.mock('../../config/env', () => ({
  env: {
    jwtSecret: 'test-access-secret-32-chars-000',
    jwtRefreshSecret: 'test-refresh-secret-32-chars-000',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    mfaTokenSecret: 'test-mfa-secret-32-chars-pad-000',
    encryptionKey: 'test-encryption-key-32-chars-000',
  },
  isProduction: jest.fn().mockReturnValue(false),
}));

import {
  generateAccessToken,
  generateRefreshToken,
  generateMfaToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  verifyMfaToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
} from '../../utils/jwt.util';
import { UserRole } from '../../types/constants';
// Used to craft tokens signed with specific secrets for type-check branch tests
import jwt from 'jsonwebtoken';

const USER_ID = 'user-uuid-123';
const EMAIL = 'alice@example.com';
const ROLE = UserRole.PATIENT;


describe('generateAccessToken / verifyAccessToken', () => {
  it('generates a verifiable access token', () => {
    const token = generateAccessToken(USER_ID, EMAIL, ROLE);
    const payload = verifyAccessToken(token);

    expect(payload.userId).toBe(USER_ID);
    expect(payload.email).toBe(EMAIL);
    expect(payload.role).toBe(ROLE);
  });

  it('generates a string token', () => {
    const token = generateAccessToken(USER_ID, EMAIL, ROLE);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT parts
  });

  it('throws an error for tampered token', () => {
    const token = generateAccessToken(USER_ID, EMAIL, ROLE);
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(() => verifyAccessToken(tampered)).toThrow('Invalid or expired access token');
  });

  it('throws an error for completely invalid token', () => {
    expect(() => verifyAccessToken('not.a.token')).toThrow('Invalid or expired access token');
  });

  it('generates different tokens for different users', () => {
    const t1 = generateAccessToken('user-1', 'a@b.com', ROLE);
    const t2 = generateAccessToken('user-2', 'b@c.com', ROLE);
    expect(t1).not.toBe(t2);
  });
});


describe('generateRefreshToken / verifyRefreshToken', () => {
  it('generates a verifiable refresh token', () => {
    const token = generateRefreshToken(USER_ID);
    const payload = verifyRefreshToken(token);

    expect(payload.userId).toBe(USER_ID);
  });

  it('throws when an access token is used as a refresh token', () => {
    const accessToken = generateAccessToken(USER_ID, EMAIL, ROLE);
    // Access token signed with different secret — should fail verification
    expect(() => verifyRefreshToken(accessToken)).toThrow('Invalid or expired refresh token');
  });

  it('throws when a validly-signed token has wrong type (type check branch)', () => {
    // Craft a token signed with the refresh secret but type = 'access' to trigger the inner type check
    const wrongTypeToken = jwt.sign(
      { userId: USER_ID, type: 'access' },
      'test-refresh-secret-32-chars-000',
      { issuer: 'healthcare-api', audience: 'healthcare-web', expiresIn: '7d' }
    );
    expect(() => verifyRefreshToken(wrongTypeToken)).toThrow('Invalid or expired refresh token');
  });

  it('throws for an invalid token string', () => {
    expect(() => verifyRefreshToken('garbage.token.value')).toThrow(
      'Invalid or expired refresh token'
    );
  });
});


describe('generateMfaToken / verifyMfaToken', () => {
  it('generates a verifiable MFA token', () => {
    const token = generateMfaToken(USER_ID);
    const payload = verifyMfaToken(token);

    expect(payload.userId).toBe(USER_ID);
  });

  it('throws for invalid MFA token', () => {
    expect(() => verifyMfaToken('bad.mfa.token')).toThrow('Invalid or expired MFA token');
  });

  it('throws when access token is used as MFA token', () => {
    const accessToken = generateAccessToken(USER_ID, EMAIL, ROLE);
    expect(() => verifyMfaToken(accessToken)).toThrow('Invalid or expired MFA token');
  });

  it('throws when a validly-signed token has wrong type (type check branch)', () => {
    // Craft a token signed with mfa secret but type = 'refresh' to trigger the inner type check
    const wrongTypeToken = jwt.sign(
      { userId: USER_ID, type: 'refresh' },
      'test-mfa-secret-32-chars-pad-000',
      { issuer: 'healthcare-api', audience: 'healthcare-web', expiresIn: '5m' }
    );
    expect(() => verifyMfaToken(wrongTypeToken)).toThrow('Invalid or expired MFA token');
  });
});


describe('generateTokenPair', () => {
  it('returns both accessToken and refreshToken', () => {
    const pair = generateTokenPair(USER_ID, EMAIL, ROLE);

    expect(pair).toHaveProperty('accessToken');
    expect(pair).toHaveProperty('refreshToken');
    expect(typeof pair.accessToken).toBe('string');
    expect(typeof pair.refreshToken).toBe('string');
  });

  it('access token contains correct claims', () => {
    const pair = generateTokenPair(USER_ID, EMAIL, ROLE);
    const payload = verifyAccessToken(pair.accessToken);

    expect(payload.userId).toBe(USER_ID);
    expect(payload.email).toBe(EMAIL);
    expect(payload.role).toBe(ROLE);
  });

  it('refresh token is independently verifiable', () => {
    const pair = generateTokenPair(USER_ID, EMAIL, ROLE);
    const payload = verifyRefreshToken(pair.refreshToken);

    expect(payload.userId).toBe(USER_ID);
  });
});


describe('decodeToken', () => {
  it('returns decoded payload without verification', () => {
    const token = generateAccessToken(USER_ID, EMAIL, ROLE);
    const decoded = decodeToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(USER_ID);
  });

  it('returns null for a completely invalid token', () => {
    // jwt.decode throws only on malformed header-segment; plain strings don't throw
    // The util catches and returns null
    const decoded = decodeToken('');
    // An empty string decodes to null in jsonwebtoken
    expect(decoded).toBeNull();
  });
});


describe('getTokenExpiration', () => {
  it('returns a future Date for a fresh token', () => {
    const token = generateAccessToken(USER_ID, EMAIL, ROLE);
    const exp = getTokenExpiration(token);

    expect(exp).toBeInstanceOf(Date);
    expect(exp!.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns null for a token without exp claim', () => {
    // A token without expiry cannot be created via generateAccessToken, so use a
    // manually crafted non-expiring token string that decodes to something without exp.
    // Easiest approach: just verify decode returns null for payloads missing exp.
    const exp = getTokenExpiration('header.e30.sig'); // e30 = base64({}) — no exp
    expect(exp).toBeNull();
  });
});


describe('isTokenExpired', () => {
  it('returns false for a freshly generated token', () => {
    const token = generateAccessToken(USER_ID, EMAIL, ROLE);
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for a token with no expiration (treated as expired)', () => {
    // When getTokenExpiration returns null, the util returns true
    expect(isTokenExpired('header.e30.sig')).toBe(true);
  });
});
