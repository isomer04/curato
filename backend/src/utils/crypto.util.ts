/**
 * Cryptographic Utility (Security - C-01)
 *
 * Provides AES-256-GCM encryption/decryption for sensitive PHI at rest.
 * Used primarily to encrypt MFA secrets before database storage.
 *
 * Versioned ciphertext format for forward-upgradeability:
 *   v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 *
 * Security notes:
 * - AES-256-GCM provides authenticated encryption (prevents tampering)
 * - A fresh random IV is generated per encryption call
 * - v1 key derivation uses HKDF (RFC 5869) via Node.js crypto.hkdfSync —
 *   a purpose-built KDF, far safer than the legacy raw SHA-256 approach
 * - Legacy format (iv:authTag:ciphertext, SHA-256 KDF) is only decrypted,
 *   never produced — all new secrets are written in v1 format
 */
import crypto from 'node:crypto';
import { env } from '../config/env';

const encryptionKey: string = env.encryptionKey;

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Key derivation

/**
 * v1 key: HKDF-SHA-256 with a fixed info string binding the key to its purpose.
 * This is the current (preferred) key derivation function.
 */
const deriveKeyV1 = (): Buffer =>
  Buffer.from(
    crypto.hkdfSync(
      'sha256',
      encryptionKey, // Input Key Material
      'healthcare-phi-salt', // Salt (fixed, non-secret context identifier)
      'mfa-secret-encryption', // Info (domain separation string)
      32 // 32 bytes = 256 bits
    )
  );

/**
 * Legacy key: SHA-256 hash of the raw secret.
 * Used ONLY for decrypting ciphertext that was written before the v1 upgrade.
 * Never used for new encryptions.
 */
const deriveKeyLegacy = (): Buffer => crypto.createHash('sha256').update(encryptionKey).digest();

// Internal helpers

/** Shared AES-256-GCM encryption using a caller-supplied key. */
const encryptWithKey = (plaintext: string, key: Buffer): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
};

/** Shared AES-256-GCM decryption using a caller-supplied key. */
const decryptWithKey = (body: string, key: Buffer): string => {
  const parts = body.split(':');
  if (parts.length !== 3) throw new Error('Invalid ciphertext format');

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/** Return true when a 3-part body has correctly sized IV and auth tag hex strings. */
const isValidCiphertextBody = (body: string): boolean => {
  const parts = body.split(':');
  if (parts.length !== 3) return false;

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const hexPattern = /^[0-9a-f]+$/i;

  return (
    ivHex.length === IV_LENGTH * 2 &&
    hexPattern.test(ivHex) &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    hexPattern.test(authTagHex) &&
    ciphertextHex.length > 0 &&
    hexPattern.test(ciphertextHex)
  );
};

// Public API

/**
 * Encrypt a plaintext string using AES-256-GCM with HKDF key derivation.
 *
 * Output format: `v1:<iv>:<authTag>:<ciphertext>` (all hex-encoded)
 *
 * @param plaintext - The string to encrypt
 * @returns Versioned encrypted string
 */
export const encrypt = (plaintext: string): string =>
  `v1:${encryptWithKey(plaintext, deriveKeyV1())}`;

/**
 * Decrypt a string produced by encrypt().
 *
 * Supports both formats transparently:
 *   - `v1:...`  → HKDF-derived key (current format)
 *   - `...:...:...` → SHA-256-derived key (legacy format, read-only)
 *
 * @param encryptedText - Encrypted string in either supported format
 * @returns Decrypted plaintext string
 * @throws Error if the format is unrecognised or decryption fails
 */
export const decrypt = (encryptedText: string): string => {
  if (encryptedText.startsWith('v1:')) {
    return decryptWithKey(encryptedText.slice(3), deriveKeyV1());
  }
  // Fall back to legacy SHA-256 derivation for ciphertext written before the upgrade.
  return decryptWithKey(encryptedText, deriveKeyLegacy());
};

/**
 * Check whether a string looks like an encrypted value.
 *
 * Handles both the current v1 format and the legacy 3-part format so that
 * migration checks in MFA service continue to work without modification.
 */
export const isEncrypted = (value: string): boolean => {
  if (value.startsWith('v1:')) {
    return isValidCiphertextBody(value.slice(3));
  }
  // Legacy format detection (no version prefix — exactly 3 hex parts).
  return isValidCiphertextBody(value);
};
