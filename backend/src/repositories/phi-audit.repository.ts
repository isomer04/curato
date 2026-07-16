import {
  PhiAuditLog,
  PhiAction,
  PhiResourceType,
  AuditOutcome,
} from '../models/PhiAuditLog.model';
import { UserRole } from '../types/constants';

// Value object — used instead of long parameter lists

/**
 * All fields needed to create a single PHI audit log entry.
 * Callers construct this object and pass it to `create` — no positional args.
 */
export interface PhiAuditEntry {
  actorId: string | null;
  actorRole: UserRole | null;
  action: PhiAction;
  resourceType: PhiResourceType;
  patientId: string | null;
  resourceId?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  outcome: AuditOutcome;
  details?: Record<string, unknown> | null;
}

// Repository

class PhiAuditRepository {
  /**
   * Persist a PHI access event.
   */
  async create(entry: PhiAuditEntry): Promise<PhiAuditLog> {
    return PhiAuditLog.create({
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      resourceType: entry.resourceType,
      patientId: entry.patientId ?? null,
      resourceId: entry.resourceId ?? null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      outcome: entry.outcome,
      details: entry.details ?? null,
    });
  }

  /** Retrieve all audit entries for a specific patient (compliance queries). */
  async findByPatientId(patientId: string): Promise<PhiAuditLog[]> {
    return PhiAuditLog.findAll({
      where: { patientId },
      order: [['createdAt', 'DESC']],
    });
  }

  /** Retrieve all audit entries performed by a specific actor. */
  async findByActorId(actorId: string): Promise<PhiAuditLog[]> {
    return PhiAuditLog.findAll({
      where: { actorId },
      order: [['createdAt', 'DESC']],
    });
  }
}

export const phiAuditRepository = new PhiAuditRepository();
