import { z, ZodString } from 'zod';

/**
 * String schema that trims whitespace and rejects ALL control characters.
 * Use this for most user input fields (names, emails, etc.)
 * Blocks entire C0 control range (0x00-0x1F) including tab/CR/LF and DEL (0x7F)
 */
export const trimmedString = (message?: string): ZodString => {
  return z
    .string()
    .trim()
    .refine(
      // eslint-disable-next-line no-control-regex
      (val) => !/[\x00-\x1F\x7F]/.test(val),
      message || 'Contains invalid control characters'
    );
};

/**
 * String schema that allows newlines, tabs, and carriage returns (for medical notes, etc.)
 * but rejects other dangerous control characters and trims leading/trailing whitespace.
 * Permits: \t (tab), \n (newline), \r (carriage return)
 * Blocks: null bytes and other C0 controls except tab/CR/LF
 */
export const trimmedText = (): ZodString => {
  return z
    .string()
    .trim()
    .refine(
      // eslint-disable-next-line no-control-regex
      (val) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(val),
      'Contains invalid control characters'
    );
};

/**
 * Password schema - NO trimming (passwords should be used exactly as typed)
 */
export const passwordString = (): ZodString => z.string();

/**
 * Email schema with trimming and lowercase normalization
 */
export const emailString = (): ZodString => {
  return z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address');
};
