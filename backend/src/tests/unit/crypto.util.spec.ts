/**
 * crypto.util.spec.ts
 * Unit tests for AES-256-GCM encryption/decryption utility.
 *
 * The module imports `env.encryptionKey` at derivation time, so we supply a
 * stable 32-char key via env mock so that encrypt→decrypt round-trips work.
 */

// env must be mocked before the util module is imported (module-level key derivation)
jest.mock('../../config/env', () => ({
  env: {
    encryptionKey: 'test-encryption-key-32-chars-000',
  },
  isProduction: jest.fn().mockReturnValue(false),
}));

import { encrypt, decrypt, isEncrypted } from '../../utils/crypto.util';

describe('CryptoUtil', () => {

  describe('encrypt', () => {
    it('produces a v1: prefixed ciphertext', () => {
      const cipher = encrypt('hello world');
      expect(cipher).toMatch(/^v1:/);
    });

    it('produces different ciphertext each call (random IV)', () => {
      const a = encrypt('same plaintext');
      const b = encrypt('same plaintext');
      expect(a).not.toBe(b);
    });

    it('ciphertext has 4 colon-delimited parts (v1 + iv + authTag + data)', () => {
      const cipher = encrypt('data');
      const parts = cipher.split(':');
      expect(parts).toHaveLength(4); // v1 | iv | authTag | ciphertext
    });

    it('encrypts empty string without throwing', () => {
      expect(() => encrypt('')).not.toThrow();
      const cipher = encrypt('');
      expect(cipher).toMatch(/^v1:/);
    });

    it('encrypts unicode/special characters', () => {
      const plain = '🚀 Secret: <script>alert(1)</script>';
      const cipher = encrypt(plain);
      expect(cipher).toMatch(/^v1:/);
    });
  });


  describe('decrypt', () => {
    it('round-trips correctly for standard string', () => {
      const plain = 'my-secret-mfa-token';
      expect(decrypt(encrypt(plain))).toBe(plain);
    });

    it('round-trips correctly for empty string', () => {
      expect(decrypt(encrypt(''))).toBe('');
    });

    it('round-trips correctly for unicode content', () => {
      const plain = '日本語テスト 🎉';
      expect(decrypt(encrypt(plain))).toBe(plain);
    });

    it('round-trips for long strings (>1000 chars)', () => {
      const plain = 'x'.repeat(2000);
      expect(decrypt(encrypt(plain))).toBe(plain);
    });

    it('throws when the ciphertext is tampered (auth tag mismatch)', () => {
      const cipher = encrypt('sensitive');
      // Corrupt the last character of the ciphertext portion
      const tampered = cipher.slice(0, -1) + (cipher.slice(-1) === 'a' ? 'b' : 'a');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('throws for completely invalid input', () => {
      expect(() => decrypt('not-valid-at-all')).toThrow();
    });

    it('throws for wrong number of parts in v1 format', () => {
      expect(() => decrypt('v1:only:two')).toThrow();
    });
  });


  describe('isEncrypted', () => {
    it('returns true for a freshly encrypted value', () => {
      expect(isEncrypted(encrypt('test'))).toBe(true);
    });

    it('returns false for a plain string', () => {
      expect(isEncrypted('plaintext-password')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('returns false for a partial v1 prefix with invalid body', () => {
      expect(isEncrypted('v1:notvalidhex:notvalidhex:')).toBe(false);
    });

    it('returns false for a string with correct structure but non-hex parts', () => {
      // Looks like legacy format but iv/authTag are not proper hex length
      expect(isEncrypted('gg:gg:00')).toBe(false);
    });

    it('returns true for well-formed v1 ciphertext even without decrypting', () => {
      const cipher = encrypt('arbitrary data');
      expect(isEncrypted(cipher)).toBe(true);
    });
  });
});
