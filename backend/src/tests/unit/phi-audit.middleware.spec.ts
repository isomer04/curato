jest.mock('../../services/phi-audit.service', () => ({
  phiAuditService: {
    log: jest.fn(),
  },
  PhiAction: {
    VIEW_MEDICAL_RECORDS: 'view_medical_records',
    EXPORT_RECORDS_CSV: 'export_records_csv',
  },
  PhiResourceType: {
    MEDICAL_RECORD: 'medical_record',
  },
  AuditOutcome: {
    SUCCESS: 'success',
    FAILURE: 'failure',
  },
}));

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import {
  createPhiAuditMiddleware,
  PhiAction,
  PhiResourceType,
} from '../../middleware/phi-audit.middleware';
import { phiAuditService, AuditOutcome } from '../../services/phi-audit.service';

/**
 * Builds a fake Express Response that supports the 'finish' event.
 * We extend EventEmitter so we can trigger res.emit('finish').
 */
const buildRes = (statusCode = 200): Response & EventEmitter => {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    statusCode,
  }) as unknown as Response & EventEmitter;
  return res;
};

const buildReq = (user?: { userId: string; role: string }): Request =>
  ({
    user,
    headers: { 'user-agent': 'test-agent' },
    ip: '10.0.0.1',
    socket: { remoteAddress: '10.0.0.1' },
  }) as unknown as Request;

describe('createPhiAuditMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
  });

  it('calls next() immediately without blocking', () => {
    const middleware = createPhiAuditMiddleware({
      action: PhiAction.VIEW_MEDICAL_RECORDS,
      resourceType: PhiResourceType.MEDICAL_RECORD,
    });

    const req = buildReq({ userId: 'u1', role: 'patient' });
    const res = buildRes();

    middleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    // phiAuditService.log should NOT be called yet (waits for 'finish')
    expect(phiAuditService.log).not.toHaveBeenCalled();
  });

  it('logs audit entry with SUCCESS on finish when status < 400', async () => {
    const middleware = createPhiAuditMiddleware({
      action: PhiAction.VIEW_MEDICAL_RECORDS,
      resourceType: PhiResourceType.MEDICAL_RECORD,
    });

    const req = buildReq({ userId: 'u1', role: 'patient' });
    const res = buildRes(200);

    middleware(req, res as unknown as Response, next);
    res.emit('finish');

    // Allow the async runAudit() to complete
    await new Promise(resolve => setImmediate(resolve));

    expect(phiAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        action: PhiAction.VIEW_MEDICAL_RECORDS,
        resourceType: PhiResourceType.MEDICAL_RECORD,
        outcome: AuditOutcome.SUCCESS,
        request: req,
      })
    );
  });

  it('logs audit entry with FAILURE on finish when status >= 400', async () => {
    const middleware = createPhiAuditMiddleware({
      action: PhiAction.EXPORT_RECORDS_CSV,
      resourceType: PhiResourceType.MEDICAL_RECORD,
    });

    const req = buildReq({ userId: 'u1', role: 'patient' });
    const res = buildRes(403);

    middleware(req, res as unknown as Response, next);
    res.emit('finish');

    await new Promise(resolve => setImmediate(resolve));

    expect(phiAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: AuditOutcome.FAILURE,
        details: { statusCode: 403 },
      })
    );
  });

  it('resolves patientId when resolver is provided', async () => {
    const resolvePatientId = jest.fn().mockResolvedValue('patient-123');

    const middleware = createPhiAuditMiddleware({
      action: PhiAction.VIEW_MEDICAL_RECORDS,
      resourceType: PhiResourceType.MEDICAL_RECORD,
      resolvePatientId,
    });

    const req = buildReq({ userId: 'u1', role: 'patient' });
    const res = buildRes(200);

    middleware(req, res as unknown as Response, next);
    res.emit('finish');

    await new Promise(resolve => setImmediate(resolve));

    expect(resolvePatientId).toHaveBeenCalled();
    expect(phiAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-123' })
    );
  });

  it('falls back to null patientId when resolver throws', async () => {
    const resolvePatientId = jest.fn().mockRejectedValue(new Error('db error'));

    const middleware = createPhiAuditMiddleware({
      action: PhiAction.VIEW_MEDICAL_RECORDS,
      resourceType: PhiResourceType.MEDICAL_RECORD,
      resolvePatientId,
    });

    const req = buildReq({ userId: 'u1', role: 'patient' });
    const res = buildRes(200);

    middleware(req, res as unknown as Response, next);
    res.emit('finish');

    await new Promise(resolve => setImmediate(resolve));

    expect(phiAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: null })
    );
  });

  it('handles unauthenticated requests (no req.user)', async () => {
    const middleware = createPhiAuditMiddleware({
      action: PhiAction.VIEW_MEDICAL_RECORDS,
      resourceType: PhiResourceType.MEDICAL_RECORD,
    });

    const req = buildReq(); // no user
    const res = buildRes(401);

    middleware(req, res as unknown as Response, next);
    res.emit('finish');

    await new Promise(resolve => setImmediate(resolve));

    expect(phiAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        actorRole: null,
      })
    );
  });
});
