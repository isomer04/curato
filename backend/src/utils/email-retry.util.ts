import { logger } from '../config/logger';

const MAX_EMAIL_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

/**
 * Send an email with exponential-backoff retry.
 *
 * Replaces the fire-and-forget `.catch()` pattern so that transient SMTP /
 * API-gateway failures are retried before giving up.  When all retries are
 * exhausted the failure is logged at `error` level with `alert: true` so
 * monitoring can trigger a human review.
 *
 * The caller should `await` this only when delivery confirmation matters
 * (e.g. password-reset).  For non-critical emails it is safe to call without
 * `await` — the function never throws.
 */
export const sendEmailWithRetry = async (
  sendFn: () => Promise<unknown>,
  context: string
): Promise<void> => {
  for (let attempt = 1; attempt <= MAX_EMAIL_RETRIES; attempt += 1) {
    try {
      await sendFn();
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < MAX_EMAIL_RETRIES) {
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        logger.warn(`Email retry scheduled (${context})`, {
          attempt,
          nextRetryMs: delay,
          error: message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      logger.error(`Email delivery failed after ${MAX_EMAIL_RETRIES} attempts (${context})`, {
        attempts: MAX_EMAIL_RETRIES,
        alert: true,
        error: message,
      });
    }
  }
};
