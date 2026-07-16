/**
 * Application-wide constants
 * 
 * This file contains all magic numbers and strings used throughout the application.
 * Centralizing these values makes the codebase more maintainable and self-documenting.
 */

// PAGINATION CONSTANTS

/**
 * Default number of items to display per page in lists/tables.
 * This value balances between showing enough data and page performance.
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum number of items that can be fetched in a single request.
 * This prevents excessive data transfer and memory usage.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Available page size options for user selection in paginated views.
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// AUTHENTICATION CONSTANTS

/**
 * Minimum password length required for user registration.
 * NIST guidelines recommend at least 8 characters for memorized secrets.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum password length to prevent DoS attacks via bcrypt.
 * bcrypt has a practical limit of 72 bytes.
 */
export const MAX_PASSWORD_LENGTH = 72;

/**
 * Minimum length for user's first and last name.
 */
export const MIN_NAME_LENGTH = 1;

/**
 * Maximum length for user's first and last name.
 * Accommodates most international names while preventing abuse.
 */
export const MAX_NAME_LENGTH = 100;

// APPOINTMENT CONSTANTS

/**
 * Minimum characters required for reason for visit field.
 * Ensures patients provide meaningful information for doctors.
 */
export const MIN_REASON_LENGTH = 10;

/**
 * Maximum characters allowed for reason for visit field.
 * Balances detail with practical display constraints.
 */
export const MAX_REASON_LENGTH = 1000;

/**
 * Minimum characters required for cancellation reason.
 * Ensures meaningful feedback when appointments are cancelled.
 */
export const MIN_CANCELLATION_REASON_LENGTH = 10;

/**
 * Default appointment slot duration in minutes.
 * Standard duration for most medical consultations.
 */
export const DEFAULT_SLOT_DURATION_MINUTES = 30;

/**
 * Number of days in advance that appointments can be booked.
 * Allows planning while preventing excessive future bookings.
 */
export const MAX_BOOKING_DAYS_AHEAD = 90;

/**
 * Available slot durations in minutes for doctor schedule configuration.
 */
export const SLOT_DURATION_OPTIONS = [15, 30, 45, 60] as const;

// TOAST/NOTIFICATION CONSTANTS

/**
 * Duration in milliseconds for success toast messages.
 * Shorter duration as success messages are less critical to read.
 */
export const SUCCESS_TOAST_DURATION_MS = 5000;

/**
 * Duration in milliseconds for error toast messages.
 * Longer duration to ensure users have time to read error details.
 */
export const ERROR_TOAST_DURATION_MS = 7000;

/**
 * Duration in milliseconds for warning toast messages.
 */
export const WARNING_TOAST_DURATION_MS = 5000;

/**
 * Duration in milliseconds for info toast messages.
 */
export const INFO_TOAST_DURATION_MS = 5000;

// UI DISPLAY CONSTANTS

/**
 * Maximum characters to show in truncated text displays.
 * Used for preview text in tables and cards.
 */
export const TEXT_TRUNCATE_LENGTH = 30;

/**
 * Maximum number of upcoming appointments to show on dashboard.
 * Keeps dashboard clean while showing relevant upcoming items.
 */
export const DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT = 5;

/**
 * Debounce delay in milliseconds for search inputs.
 * Prevents excessive API calls while user is typing.
 */
export const SEARCH_DEBOUNCE_MS = 300;

// DATE/TIME CONSTANTS

/**
 * Date format for API requests (ISO 8601 date only).
 */
export const API_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Date format for displaying dates to users.
 */
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';

/**
 * Time format for displaying times to users.
 */
export const DISPLAY_TIME_FORMAT = 'HH:mm';

/**
 * Full datetime format for displaying date and time together.
 */
export const DISPLAY_DATETIME_FORMAT = 'MMM d, yyyy HH:mm';
