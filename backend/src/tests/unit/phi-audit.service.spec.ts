jest.mock('../../repositories/phi-audit.repository', () => ({
  phiAuditRepository: {
    create: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  phiAuditService,
  PhiAction,
  PhiResourceType,
  AuditOutcome,
} from '../../services/phi-audit.service';
import { phiAuditRepository } from '../../repositories/phi-audit.repository';
import { logger } from '../../config/logger';
import { UserRole } from '../../types/constants';
import { Request } from 'express';

/** Build a minimal fake Express Request */
const makeRequest = (overrides: Record<string, unknown> = {}): Request =>
  ({
    headers: { 'user-agent': 'jest-test-agent' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  }) as unknown as Request;

const baseParams = {
  actorId: 'user-uuid',
  actorRole: UserRole.DOCTOR,
  action: PhiAction.VIEW_MEDICAL_RECORDS,
  resourceType: PhiResourceType.MEDICAL_RECORD,
  patientId: 'patient-uuid',
  request: makeRequest(),
  outcome: AuditOutcome.SUCCESS,
};

describe('PhiAuditService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('log', () => {
    it('happy path — persists audit entry and logs info', async () => {
      const mockEntry = { id: 'audit-1' };
      (phiAuditRepository.create as jest.Mock).mockResolvedValue(mockEntry);

      await phiAuditService.log(baseParams);

      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-uuid',
          actorRole: UserRole.DOCTOR,
          action: PhiAction.VIEW_MEDICAL_RECORDS,
          outcome: AuditOutcome.SUCCESS,
          ipAddress: '127.0.0.1',
          userAgent: 'jest-test-agent',
        })
      );
      expect(logger.info as jest.Mock).toHaveBeenCalled();
    });

    it('uses req.ip (trust-proxy-resolved) instead of raw X-Forwarded-For', async () => {
      const mockEntry = { id: 'audit-2' };
      (phiAuditRepository.create as jest.Mock).mockResolvedValue(mockEntry);

      const req = makeRequest({
        ip: '203.0.113.1',
        headers: {
          'x-forwarded-for': '1.2.3.4, 10.0.0.1',
          'user-agent': 'test',
        },
      });

      await phiAuditService.log({ ...baseParams, request: req });

      // Should use req.ip (set by Express trust proxy), NOT the raw header
      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '203.0.113.1' })
      );
    });

    it('sets resourceId when provided', async () => {
      (phiAuditRepository.create as jest.Mock).mockResolvedValue({ id: 'audit-3' });

      await phiAuditService.log({ ...baseParams, resourceId: 'record-42' });

      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'record-42' })
      );
    });

    it('passes details when provided', async () => {
      (phiAuditRepository.create as jest.Mock).mockResolvedValue({ id: 'audit-4' });

      await phiAuditService.log({ ...baseParams, details: { format: 'pdf', count: 5 } });

      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ details: { format: 'pdf', count: 5 } })
      );
    });

    it('handles null actorId (unauthenticated access)', async () => {
      (phiAuditRepository.create as jest.Mock).mockResolvedValue({ id: 'audit-5' });

      await phiAuditService.log({ ...baseParams, actorId: null, actorRole: null });

      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: null, actorRole: null })
      );
    });

    it('retries and logs terminal error when persistence fails repeatedly', async () => {
      (phiAuditRepository.create as jest.Mock).mockRejectedValue(new Error('db unavailable'));

      await expect(phiAuditService.log(baseParams)).resolves.toBeUndefined();

      expect(phiAuditRepository.create).toHaveBeenCalledTimes(3);
      expect(logger.warn as jest.Mock).toHaveBeenCalled();
      expect(logger.error as jest.Mock).toHaveBeenCalledWith(
        'PHI audit persistence failed after retries',
        expect.objectContaining({ attempts: 3, alert: true })
      );
    });

    it('never throws even when repository throws', async () => {
      (phiAuditRepository.create as jest.Mock).mockRejectedValue(new Error('unexpected error'));

      await expect(phiAuditService.log(baseParams)).resolves.toBeUndefined();
    });

    it('handles FAILURE outcome', async () => {
      (phiAuditRepository.create as jest.Mock).mockResolvedValue({ id: 'audit-6' });

      await phiAuditService.log({ ...baseParams, outcome: AuditOutcome.FAILURE });

      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: AuditOutcome.FAILURE })
      );
    });

    it('works when socket.remoteAddress is undefined', async () => {
      (phiAuditRepository.create as jest.Mock).mockResolvedValue({ id: 'audit-7' });
      const req = { headers: { 'user-agent': 'test' }, socket: {} } as unknown as Request;

      await phiAuditService.log({ ...baseParams, request: req });

      expect(phiAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: null })
      );
    });
  });
});
