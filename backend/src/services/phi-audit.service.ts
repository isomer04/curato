import { Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { PhiAction, PhiResourceType, AuditOutcome } from '../models/PhiAuditLog.model';
import { phiAuditRepository } from '../repositories/phi-audit.repository';
import { logger } from '../config/logger';
import { UserRole } from '../types/constants';


export interface LogPhiAccessParams {
  /** Authenticated user who triggered the access (null = unauthenticated). */
  actorId: string | null;
  actorRole: UserRole | null;
  action: PhiAction;
  resourceType: PhiResourceType;
  /** Patient whose PHI was accessed. */
  patientId: string | null;
  /** Specific record that was accessed, if known at log time. */
  resourceId?: string | null;
  /** Express request — used to extract IP and User-Agent. */
  request: Request;
  outcome: AuditOutcome;
  /** Optional freeform context (e.g. export format, record count). */
  details?: Record<string, unknown>;
}


/**
 * Extract the real client IP from an Express request.
 *
 * Uses req.ip which honours the app-level `trust proxy` setting
 * (see app.ts — `app.set('trust proxy', 1)`).  When trust proxy is
 * configured, Express strips the leftmost X-Forwarded-For entry and
 * validates it against the trusted hop count, preventing spoofing.
 *
 * Manually parsing X-Forwarded-For would bypass that protection and
 * allow an attacker to inject an arbitrary IP into audit logs.
 */
const resolveIpAddress = (req: Request): string | null =>
  req.ip ?? req.socket?.remoteAddress ?? null;

const resolveUserAgent = (req: Request): string | null => req.headers['user-agent'] ?? null;

const PHI_AUDIT_MAX_ATTEMPTS = 3;
const PHI_AUDIT_RETRY_DELAY_MS = 100;

/**
 * Dead-letter file for PHI audit entries that cannot be persisted to the
 * database after all retries.  HIPAA §164.312(b) requires that audit
 * records are never silently lost.  This file guarantees recoverability
 * even when the primary store is down.
 */
const PHI_DEAD_LETTER_PATH = path.join(process.cwd(), 'logs', 'phi-audit-dead-letter.jsonl');

const wait = async (ms: number): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, ms));
};


class PhiAuditService {
  /**
   * Record a PHI access event.
   *
   * This method is fire-and-forget — it never throws.
   * Any persistence errors are logged and silently swallowed so that audit
   * failures never block the primary request/response cycle.
   */
  async log(params: LogPhiAccessParams): Promise<void> {
    const {
      actorId,
      actorRole,
      action,
      resourceType,
      patientId,
      resourceId,
      request,
      outcome,
      details,
    } = params;

    const payload = {
      actorId,
      actorRole,
      action,
      resourceType,
      patientId: patientId ?? null,
      resourceId: resourceId ?? null,
      ipAddress: resolveIpAddress(request),
      userAgent: resolveUserAgent(request),
      outcome,
      details: details ?? null,
    };

    for (let attempt = 1; attempt <= PHI_AUDIT_MAX_ATTEMPTS; attempt += 1) {
      try {
        const entry = await phiAuditRepository.create(payload);
        logger.info('PHI audit logged', {
          auditId: entry.id,
          actorId,
          action,
          resourceType,
          patientId,
          outcome,
          attempt,
        });
        return;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (attempt < PHI_AUDIT_MAX_ATTEMPTS) {
          logger.warn('PHI audit persistence retry scheduled', {
            actorId,
            action,
            resourceType,
            patientId,
            attempt,
            error: errorMessage,
          });
          await wait(PHI_AUDIT_RETRY_DELAY_MS * attempt);
          continue;
        }

        logger.error('PHI audit persistence failed after retries', {
          actorId,
          action,
          resourceType,
          patientId,
          attempts: PHI_AUDIT_MAX_ATTEMPTS,
          alert: true,
          error: errorMessage,
        });

        // Dead-letter: append the failed audit entry as JSONL so it can be
        // replayed into the database once the store recovers.  This ensures
        // HIPAA-required audit records are never silently lost.
        try {
          const deadLetterEntry = JSON.stringify({
            ...payload,
            failedAt: new Date().toISOString(),
            error: errorMessage,
          });
          fs.appendFileSync(PHI_DEAD_LETTER_PATH, deadLetterEntry + '\n');
          logger.warn('PHI audit entry written to dead-letter file', {
            path: PHI_DEAD_LETTER_PATH,
          });
        } catch (dlError: unknown) {
          // Last resort — if even the dead-letter file fails, log the full
          // payload so it still appears in the structured log output.
          logger.error('PHI audit dead-letter write ALSO failed — dumping payload', {
            payload,
            dlError: dlError instanceof Error ? dlError.message : String(dlError),
            alert: true,
          });
        }
      }
    }
  }
}

export const phiAuditService = new PhiAuditService();

export { PhiAction, PhiResourceType, AuditOutcome };
