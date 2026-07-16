/**
 * Password Utility
 *
 * Provides secure password hashing and validation functions.
 * Uses bcrypt for password hashing which is resistant to rainbow table attacks.
 *
 * Security Notes:
 * - Never store plain text passwords
 * - Always use async versions of bcrypt to avoid blocking the event loop
 * - Password strength requirements follow NIST guidelines
 */
import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../config/constants';

/**
 * Result of password strength validation.
 */
interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Hash a plain text password using bcrypt.
 *
 * Uses a configurable number of salt rounds (from constants).
 * Higher salt rounds = more secure but slower.
 *
 * @param password - Plain text password to hash
 * @returns Hashed password string
 *
 * @example
 * const hashedPassword = await hashPassword('MySecurePassword123!');
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a candidate password against a hashed password.
 *
 * Uses bcrypt's timing-safe comparison to prevent timing attacks.
 *
 * @param candidatePassword - Plain text password to check
 * @param hashedPassword - Previously hashed password to compare against
 * @returns True if passwords match, false otherwise
 *
 * @example
 * const isMatch = await comparePassword(userInput, storedHash);
 * if (!isMatch) {
 *   throw new Error('Invalid credentials');
 * }
 */
export const comparePassword = async (
  candidatePassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * Validate password strength against security requirements.
 *
 * Requirements:
 * - Minimum length: MIN_PASSWORD_LENGTH (from constants)
 * - Maximum length: MAX_PASSWORD_LENGTH (from constants)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * These requirements follow NIST SP 800-63B guidelines with additional
 * complexity requirements for enhanced security.
 *
 * @param password - Password to validate
 * @returns Object containing validation result and any error messages
 *
 * @example
 * const result = validatePasswordStrength(userPassword);
 * if (!result.isValid) {
 *   res.status(400).json({ errors: result.errors });
 * }
 */
export const validatePasswordStrength = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Check maximum length (bcrypt has a 72 byte limit)
  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a password is commonly used (weak password detection).
 *
 * This list covers the top ~100 most common passwords seen in real-world
 * breach datasets.  In a production environment with strict security
 * requirements, integrate the HaveIBeenPwned Pwned Passwords API
 * (k-anonymity model) or load the full HIBP list into a local trie/Bloom
 * filter to check against 800M+ compromised passwords without exposing the
 * user's password to a third-party service.
 *
 * @param password - Password to check
 * @returns True if password is commonly used, false otherwise
 */
// Top-100 most-cracked passwords from major breach datasets (HaveIBeenPwned et al.)
// Hoisted to module scope so the Set is constructed once rather than on every call.
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'password!',
  'password1!',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '000000',
  'qwerty',
  'qwerty123',
  'qwerty!',
  'qwerty123!',
  'qwertyuiop',
  'abc123',
  'abc123!',
  'abcdef',
  'abcdef1',
  'letmein',
  'letmein1',
  'letmein!',
  'welcome',
  'welcome1',
  'welcome!',
  'welcome123',
  'admin',
  'admin1',
  'admin123',
  'administrator',
  'login',
  'login1',
  'login123',
  'iloveyou',
  'iloveyou1',
  'iloveyou!',
  'monkey',
  'monkey1',
  'monkey123',
  'dragon',
  'dragon1',
  'dragon123',
  'master',
  'master1',
  'master123',
  'shadow',
  'shadow1',
  'shadow123',
  'sunshine',
  'sunshine1',
  'sunshine123',
  'princess',
  'princess1',
  'princess123',
  'superman',
  'superman1',
  'superman123',
  'batman',
  'batman1',
  'batman123',
  'trustno1',
  'trustno1!',
  'football',
  'football1',
  'football123',
  'baseball',
  'baseball1',
  'baseball123',
  'soccer',
  'soccer1',
  'soccer123',
  'hockey',
  'hockey1',
  'hockey123',
  'michael',
  'michael1',
  'michael123',
  'charlie',
  'charlie1',
  'charlie123',
  'donald',
  'donald1',
  'donald123',
  'passwd',
  'pass',
  'passw0rd',
  'p@ssword',
  'p@ssw0rd',
  'p@ssword1',
  'p@ssword1!',
  'p@$$word',
  'pa$$word',
  'test',
  'test1',
  'test123',
  'testing',
  'testing1',
  'changeme',
  'changeme1',
  'changeme!',
  'secret',
  'secret1',
  'secret123',
  'hello',
  'hello123',
  'hello1',
  'world',
  'world123',
  '1q2w3e',
  '1q2w3e4r',
  '1q2w3e4r5t',
  'q1w2e3r4',
  'q1w2e3r4t5',
  'zxcvbn',
  'zxcvbnm',
  'asdfgh',
  'asdfghjkl',
  'qazwsx',
  'qazwsxedc',
]);

export const isCommonPassword = (password: string): boolean => {
  return COMMON_PASSWORDS.has(password.toLowerCase());
};
