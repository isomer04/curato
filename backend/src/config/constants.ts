/**
 * Backend Application Constants
 *
 * This file contains all magic numbers and configuration values used throughout
 * the backend application. Centralizing these values ensures:
 * - Consistency across the application
 * - Easy configuration changes
 * - Self-documenting code
 * - Easier testing and maintenance
 */

// AUTHENTICATION CONSTANTS

/**
 * Minimum password length required for user registration.
 * Based on NIST SP 800-63B guidelines for memorized secrets.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum password length to prevent DoS attacks via bcrypt.
 * bcrypt has a practical limit of 72 bytes for input.
 */
export const MAX_PASSWORD_LENGTH = 72;

/**
 * Number of bcrypt salt rounds for password hashing.
 * Higher values = more secure but slower. 12 is a good balance for 2024.
 * Each increment roughly doubles the computation time.
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Access token expiration time.
 * Short-lived for security; refreshed using refresh tokens.
 */
export const ACCESS_TOKEN_EXPIRY = '15m';

/**
 * Refresh token expiration time.
 * Longer-lived to reduce login frequency while maintaining security.
 */
export const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Maximum number of failed login attempts before account lockout.
 * Prevents brute-force attacks while allowing for genuine mistakes.
 */
export const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Account lockout duration in minutes after max failed attempts.
 * Should be long enough to discourage attacks but not frustrate users.
 */
export const LOCKOUT_DURATION_MINUTES = 15;

// PAGINATION CONSTANTS

/**
 * Default number of items per page when not specified.
 * Balances data visibility with performance.
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum items per page to prevent memory issues.
 * Prevents clients from requesting excessive data.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default page number when not specified.
 * Pages are 1-indexed for user-friendliness.
 */
export const DEFAULT_PAGE = 1;

// RATE LIMITING CONSTANTS

/**
 * Rate limit window in milliseconds (15 minutes).
 * Time window for counting requests.
 */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Maximum general API requests per window.
 * Allows normal usage while preventing abuse.
 * Default for `RATE_LIMIT_MAX_REQUESTS` in env (see env.ts).
 */
export const RATE_LIMIT_MAX_REQUESTS = 500;

/**
 * Maximum login attempts per window.
 * Stricter limit to prevent credential stuffing attacks.
 */
export const RATE_LIMIT_LOGIN_MAX = 10;

/**
 * Maximum password reset requests per window.
 * Prevents abuse of password reset functionality.
 */
export const RATE_LIMIT_PASSWORD_RESET_MAX = 5;

// APPOINTMENT CONSTANTS

/**
 * Minimum characters for reason for visit field.
 * Ensures patients provide meaningful information.
 */
export const MIN_REASON_LENGTH = 10;

/**
 * Maximum characters for reason for visit field.
 * Prevents excessive data storage while allowing detailed descriptions.
 */
export const MAX_REASON_LENGTH = 1000;

/**
 * Minimum characters for cancellation reason.
 * Ensures meaningful feedback when appointments are cancelled.
 */
export const MIN_CANCELLATION_REASON_LENGTH = 10;

/**
 * Default appointment slot duration in minutes.
 * Standard duration for most medical consultations.
 */
export const DEFAULT_SLOT_DURATION_MINUTES = 30;

/**
 * Minimum slot duration allowed in minutes.
 * Shortest practical appointment duration.
 */
export const MIN_SLOT_DURATION_MINUTES = 15;

/**
 * Maximum slot duration allowed in minutes.
 * Longest single appointment slot.
 */
export const MAX_SLOT_DURATION_MINUTES = 120;

/**
 * Maximum days in advance an appointment can be booked.
 * Allows planning while preventing excessive future bookings.
 */
export const MAX_BOOKING_DAYS_AHEAD = 90;

/**
 * Maximum number of records returned in a single export (CSV/PDF).
 * Prevents unbounded memory usage when patients have very large histories.
 */
export const MAX_EXPORT_RECORDS = 5_000;

/**
 * Minimum hours before appointment that cancellation is allowed.
 * Gives doctors time to fill cancelled slots.
 */
export const MIN_CANCELLATION_NOTICE_HOURS = 24;

// VALIDATION CONSTANTS

/**
 * Minimum name length for first/last name fields.
 */
export const MIN_NAME_LENGTH = 1;

/**
 * Maximum name length for first/last name fields.
 * Accommodates most international names.
 */
export const MAX_NAME_LENGTH = 100;

/**
 * Maximum email length as per RFC 5321.
 */
export const MAX_EMAIL_LENGTH = 254;

/**
 * Maximum length for text fields (notes, descriptions).
 */
export const MAX_TEXT_FIELD_LENGTH = 2000;

/**
 * Maximum file upload size in bytes (5MB).
 * For profile photos and document uploads.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// HTTP STATUS CONSTANTS

/**
 * HTTP status codes used throughout the application.
 * Centralized for consistency and easy reference.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// DATABASE CONSTANTS

/**
 * Database connection pool minimum connections.
 * Maintains minimum connections for quick query response.
 */
export const DB_POOL_MIN = 5;

/**
 * Database connection pool maximum connections.
 * Limits concurrent connections to prevent database overload.
 */
export const DB_POOL_MAX = 20;

/**
 * Database connection acquire timeout in milliseconds.
 * Time to wait for a connection from the pool.
 */
export const DB_ACQUIRE_TIMEOUT_MS = 30000;

/**
 * Database connection idle timeout in milliseconds.
 * How long a connection can be idle before being released.
 */
export const DB_IDLE_TIMEOUT_MS = 10000;

// LOGGING CONSTANTS

/**
 * Maximum log file size before rotation (10MB).
 */
export const LOG_MAX_SIZE = '10m';

/**
 * Maximum number of log files to keep.
 */
export const LOG_MAX_FILES = 5;

/**
 * Log date format for consistent timestamps.
 */
export const LOG_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
