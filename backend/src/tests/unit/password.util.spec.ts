/**
 * password.util.spec.ts
 * Unit tests for bcrypt password hashing and strength validation utilities.
 */

import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  isCommonPassword,
} from '../../utils/password.util';


describe('hashPassword / comparePassword', () => {
  const PLAIN = 'MySecureP@ssw0rd!';

  it('produces a hash that is different from the plain text', async () => {
    const hash = await hashPassword(PLAIN);
    expect(hash).not.toBe(PLAIN);
  });

  it('produces a bcrypt hash (starts with $2b$ or $2a$)', async () => {
    const hash = await hashPassword(PLAIN);
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('produces a different hash each time (random salt)', async () => {
    const h1 = await hashPassword(PLAIN);
    const h2 = await hashPassword(PLAIN);
    expect(h1).not.toBe(h2);
  });

  it('comparePassword returns true for correct password', async () => {
    const hash = await hashPassword(PLAIN);
    expect(await comparePassword(PLAIN, hash)).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const hash = await hashPassword(PLAIN);
    expect(await comparePassword('WrongPassword!', hash)).toBe(false);
  });

  it('comparePassword returns false for empty string against a valid hash', async () => {
    const hash = await hashPassword(PLAIN);
    expect(await comparePassword('', hash)).toBe(false);
  });

  it('comparePassword handles unicode characters', async () => {
    const unicode = '正確パスワード123!A';
    const hash = await hashPassword(unicode);
    expect(await comparePassword(unicode, hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});


describe('validatePasswordStrength', () => {
  it('marks a strong password as valid', () => {
    const result = validatePasswordStrength('MySecureP@ssw0rd!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when password is too short', () => {
    const result = validatePasswordStrength('Ab1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('at least'))).toBe(true);
  });

  it('fails when there is no uppercase letter', () => {
    const result = validatePasswordStrength('alllowercase1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('uppercase'))).toBe(true);
  });

  it('fails when there is no lowercase letter', () => {
    const result = validatePasswordStrength('ALLUPPERCASE1!');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('lowercase'))).toBe(true);
  });

  it('fails when there is no number', () => {
    const result = validatePasswordStrength('NoNumbers!Here');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('number'))).toBe(true);
  });

  it('fails when there is no special character', () => {
    const result = validatePasswordStrength('NoSpecialChar1');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('special'))).toBe(true);
  });

  it('fails when password exceeds maximum length', () => {
    const result = validatePasswordStrength('A1a!' + 'x'.repeat(300));
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        e => e.toLowerCase().includes('exceed') || e.toLowerCase().includes('not exceed')
      )
    ).toBe(true);
  });

  it('accumulates multiple errors simultaneously', () => {
    // missing uppercase, number, and special
    const result = validatePasswordStrength('alllowercase');
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('accepts passwords with various special characters', () => {
    for (const special of ['!', '@', '#', '$', '%', '^', '&', '*']) {
      const pwd = `MyPass1${special}`;
      expect(validatePasswordStrength(pwd).isValid).toBe(true);
    }
  });
});


describe('isCommonPassword', () => {
  it('identifies commonly used passwords', () => {
    const common = ['password', 'password123', '123456', 'qwerty', 'admin', 'letmein'];
    for (const pwd of common) {
      expect(isCommonPassword(pwd)).toBe(true);
    }
  });

  it('is case-insensitive for common password detection', () => {
    expect(isCommonPassword('PASSWORD')).toBe(true);
    expect(isCommonPassword('Password123')).toBe(true);
    expect(isCommonPassword('QWERTY')).toBe(true);
  });

  it('returns false for a unique secure password', () => {
    expect(isCommonPassword('xKj9$mP#wQ2!rT5@')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isCommonPassword('')).toBe(false);
  });

  it('returns false for a password similar to but not exactly a common one', () => {
    // 'password1234' is not in the list (only 'password123' is)
    expect(isCommonPassword('password1234')).toBe(false);
  });

  it('identifies all top-10 most common passwords', () => {
    const top10 = [
      'password',
      '123456',
      'qwerty',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'master',
      'abc123',
    ];
    for (const pwd of top10) {
      expect(isCommonPassword(pwd)).toBe(true);
    }
  });
});
