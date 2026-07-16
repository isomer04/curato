/**
 * PHI Audit Middleware Factory (HIPAA Compliance - C-02)
 *
 * Returns a route-level middleware that records PHI access events after the
 * response is sent. Using the `res.finish` event guarantees the log entry
 * always reflects the actual HTTP outcome (2xx = success, 4xx/5xx = failure),
 * not merely the fact that the route was entered.
 *
 * Usage:
 *   router.get('/my-records', requirePatient, createPhiAuditMiddleware({
 *     action: PhiAction.VIEW_MEDICAL_RECORDS,
 *     resourceType: PhiResourceType.MEDICAL_RECORD,
 *     resolvePatientId: async (req) => resolvePatientIdFromUser(req.user!.userId),
 *   }), medicalRecordController.getMyRecords);
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types/express-augment';
import {
  PhiAction,
  PhiResourceType,
  AuditOutcome,
  phiAuditService,
} from '../services/phi-audit.service';

// Options value object — no long parameter lists

export interface PhiAuditMiddlewareOptions {
  /** Which PHI action this route performs. */
  action: PhiAction;
  /** Which category of resource is being accessed. */
  resourceType: PhiResourceType;
  /**
   * Optional async function to derive the patient's ID from the request.
   * When omitted, `patientId` is logged as null (still a valid audit entry).
   *
   * Keep implementations lightweight — a single indexed DB lookup is fine.
   */
  resolvePatientId?: (req: AuthenticatedRequest) => Promise<string | null>;
}

// Factory

/**
 * Create a PHI audit middleware for a specific route.
 *
 * @param options - Describes the PHI action and how to resolve the patient.
 * @returns Express `RequestHandler` that logs after the response is sent.
 */
export const createPhiAuditMiddleware = (options: PhiAuditMiddlewareOptions): RequestHandler => {
  const { action, resourceType, resolvePatientId } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Cast is safe — this middleware is applied after authMiddleware
    // which guarantees req.user is populated on protected routes.
    const authenticatedReq = req as AuthenticatedRequest;
    // Register the audit hook on response finish so we capture the real outcome.
    res.on('finish', () => {
      const isSuccess = res.statusCode < 400;
      const outcome: AuditOutcome = isSuccess ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE;

      const actor = authenticatedReq.user ?? null;

      // Resolve patient ID and then fire the log — fully async, never blocking.
      const runAudit = async (): Promise<void> => {
        const patientId = resolvePatientId
          ? await resolvePatientId(authenticatedReq).catch(() => null)
          : null;

        await phiAuditService.log({
          actorId: actor?.userId ?? null,
          actorRole: actor?.role ?? null,
          action,
          resourceType,
          patientId,
          request: req,
          outcome,
          details: { statusCode: res.statusCode },
        });
      };

      void runAudit();
    });

    next();
  };
};

// Re-export for convenience so route files only need one import.
export { PhiAction, PhiResourceType };
