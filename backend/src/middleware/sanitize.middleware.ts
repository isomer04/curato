import { Request, Response, NextFunction } from 'express';

/**
 * Fields whose values must pass through exactly as typed.
 * Passwords, tokens, and secrets must never be trimmed or altered.
 */
const SANITIZE_SKIP_FIELDS = new Set([
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'confirmNewPassword',
    'token',
    'tempToken',
    'refreshToken',
]);

/**
 * Strip null bytes and non-printable ASCII control characters (except tab,
 * newline, and carriage return which are legitimate in medical notes).
 *
 * This is the correct approach for a healthcare REST API:
 *  - We are storing data, not rendering it as HTML.
 *  - HTML-encoding at the input layer corrupts medical text like
 *    "O'Brien", "< 5 mg", "100 & 200".
 *  - SQL injection is prevented by Sequelize parameterised queries, not
 *    by escaping input.
 *  - XSS is prevented by encoding at the output / template layer.
 */
const sanitizeString = (str: string): string => {
    // Remove null bytes (could be used to bypass length checks or confuse parsers)
    // Remove other non-printable control chars (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F)
    // but keep 0x09 (tab), 0x0A (newline), 0x0D (carriage return)
    // eslint-disable-next-line no-control-regex
    const CONTROL_CHARS = /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
    return str
        .replace(/\0/g, '')
        .replace(CONTROL_CHARS, '')
        .trim();
};

// Recursively sanitize object values, skipping specified keys
const sanitizeValue = (value: unknown, key?: string): unknown => {
    // Skip sanitization for sensitive credential fields
    if (key && SANITIZE_SKIP_FIELDS.has(key)) {
        return value;
    }

    if (typeof value === 'string') {
        return sanitizeString(value);
    }

    if (Array.isArray(value)) {
        return value.map(v => sanitizeValue(v));
    }

    if (value !== null && typeof value === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(value)) {
            sanitized[k] = sanitizeValue(val, k);
        }
        return sanitized;
    }

    return value;
};

export const sanitizeMiddleware = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body) as Record<string, unknown>;
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitizeValue(req.query) as Record<string, unknown>;
        for (const key of Object.keys(req.query)) {
            delete req.query[key];
        }
        Object.assign(req.query, sanitizedQuery);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
        const sanitizedParams = sanitizeValue(req.params) as Record<string, unknown>;
        for (const [key, value] of Object.entries(sanitizedParams)) {
            req.params[key] = value as string;
        }
    }

    next();
};

// Middleware to remove potentially dangerous fields from request bodies
export const removeUnsafeFields = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const unsafeFields = ['__proto__', 'constructor', 'prototype'];

    const removeFields = (obj: Record<string, unknown>): void => {
        for (const field of unsafeFields) {
            if (field in obj) {
                delete obj[field];
            }
        }

        for (const value of Object.values(obj)) {
            if (value !== null && typeof value === 'object') {
                removeFields(value as Record<string, unknown>);
            }
        }
    };

    if (req.body && typeof req.body === 'object') {
        removeFields(req.body as Record<string, unknown>);
    }

    next();
};
