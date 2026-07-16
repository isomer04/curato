jest.mock('../../repositories/patient.repository', () => ({
  patientRepository: {
    findByUserId: jest.fn(),
  },
}));

jest.mock('../../repositories/insurance.repository', () => ({
  insuranceRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByPatientId: jest.fn(),
    findActive: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { insuranceService } from '../../services/insurance.service';
import { patientRepository } from '../../repositories/patient.repository';
import { insuranceRepository } from '../../repositories/insurance.repository';
import { NotFoundError, ForbiddenError } from '../../shared/errors';
import { InsuranceStatus, UserRole } from '../../types/constants';

const makeInsurance = (overrides: Record<string, unknown> = {}) => ({
  id: 'ins1',
  patientId: 'p1',
  providerName: 'Blue Cross',
  policyNumber: 'POL-001',
  subscriberName: 'Alice Smith',
  verificationStatus: InsuranceStatus.PENDING,
  isActive: true,
  update: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makePatient = () => ({ id: 'p1', userId: 'u1' });

describe('InsuranceService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('create', () => {
    const input = {
      providerName: 'Blue Cross',
      policyNumber: 'POL-001',
      subscriberName: 'Alice Smith',
      coverageStartDate: '2024-01-01',
    };

    it('happy path — creates insurance and returns it', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance();
      (insuranceRepository.create as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.create('u1', input);

      expect(insuranceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'p1',
          verificationStatus: InsuranceStatus.PENDING,
        })
      );
      expect(result).toBe(mockIns);
    });

    it('defaults subscriberRelation to "self" when not provided', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.create as jest.Mock).mockResolvedValue(makeInsurance());

      await insuranceService.create('u1', input);

      expect(insuranceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subscriberRelation: 'self' })
      );
    });

    it('throws NotFoundError when patient profile not found', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      await expect(insuranceService.create('u1', input)).rejects.toThrow(NotFoundError);
    });

    it('passes optional coverageEndDate as Date', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.create as jest.Mock).mockResolvedValue(makeInsurance());

      await insuranceService.create('u1', { ...input, coverageEndDate: '2024-12-31' });

      expect(insuranceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ coverageEndDate: expect.any(Date) })
      );
    });
  });


  describe('update', () => {
    it('happy path — updates insurance fields', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (insuranceRepository.update as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.update('ins1', 'u1', { providerName: 'Aetna' });

      expect(insuranceRepository.update).toHaveBeenCalled();
      expect(result).toBe(mockIns);
    });

    it('throws NotFoundError when insurance not found', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(insuranceService.update('ghost', 'u1', {})).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when insurance belongs to different patient', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance({ patientId: 'other-patient' });
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      await expect(insuranceService.update('ins1', 'u1', {})).rejects.toThrow(ForbiddenError);
    });
  });


  describe('verify', () => {
    it('happy path — verifies insurance with valid status', async () => {
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (insuranceRepository.update as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.verify('ins1', {
        status: InsuranceStatus.VERIFIED,
        notes: 'Confirmed with provider',
      });

      expect(insuranceRepository.update).toHaveBeenCalledWith(
        mockIns,
        expect.objectContaining({
          verificationStatus: InsuranceStatus.VERIFIED,
          verificationDate: expect.any(Date),
        })
      );
      expect(result).toBe(mockIns);
    });

    it('throws NotFoundError when insurance not found', async () => {
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        insuranceService.verify('ghost', { status: InsuranceStatus.VERIFIED })
      ).rejects.toThrow(NotFoundError);
    });
  });


  describe('deactivate', () => {
    it('deactivates insurance record', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (insuranceRepository.update as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.deactivate('ins1', 'u1');

      expect(insuranceRepository.update).toHaveBeenCalledWith(
        mockIns,
        expect.objectContaining({ isActive: false })
      );
      expect(result).toBe(mockIns);
    });

    it('throws ForbiddenError for wrong patient', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(
        makeInsurance({ patientId: 'other' })
      );
      await expect(insuranceService.deactivate('ins1', 'u1')).rejects.toThrow(ForbiddenError);
    });
  });


  describe('delete', () => {
    it('deletes insurance record', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (insuranceRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await insuranceService.delete('ins1', 'u1');

      expect(insuranceRepository.delete).toHaveBeenCalledWith(mockIns);
    });

    it('throws ForbiddenError for wrong patient', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(
        makeInsurance({ patientId: 'other' })
      );
      await expect(insuranceService.delete('ins1', 'u1')).rejects.toThrow(ForbiddenError);
    });
  });


  describe('getAll', () => {
    it('returns all insurance records for patient', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.findByPatientId as jest.Mock).mockResolvedValue([makeInsurance()]);

      const result = await insuranceService.getAll('u1');
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundError when patient not found', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      await expect(insuranceService.getAll('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('getById', () => {
    it('happy path — patient reads their own insurance record', async () => {
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      const result = await insuranceService.getById('ins1', 'u1', UserRole.PATIENT);
      expect(result).toBe(mockIns);
    });

    it('happy path — doctor reads any insurance record without ownership check', async () => {
      const mockIns = makeInsurance({ patientId: 'other-patient' });
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.getById('ins1', 'doc1', UserRole.DOCTOR);
      expect(result).toBe(mockIns);
      expect(patientRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('happy path — admin reads any insurance record without ownership check', async () => {
      const mockIns = makeInsurance({ patientId: 'other-patient' });
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.getById('ins1', 'admin1', UserRole.ADMIN);
      expect(result).toBe(mockIns);
      expect(patientRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('edge case — throws ForbiddenError when patient reads another patient\'s record', async () => {
      const mockIns = makeInsurance({ patientId: 'other-patient' });
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient()); // patientId = 'p1'

      await expect(insuranceService.getById('ins1', 'u1', UserRole.PATIENT)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('error case — throws NotFoundError when insurance record does not exist', async () => {
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        insuranceService.getById('ghost', 'u1', UserRole.PATIENT)
      ).rejects.toThrow(NotFoundError);
    });
  });


  describe('getActive', () => {
    it('returns active insurance for patient', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance({ verificationStatus: InsuranceStatus.VERIFIED });
      (insuranceRepository.findActive as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.getActive('u1');
      expect(result).toBe(mockIns);
    });

    it('returns null when no active insurance', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (insuranceRepository.findActive as jest.Mock).mockResolvedValue(null);

      const result = await insuranceService.getActive('u1');
      expect(result).toBeNull();
    });
  });


  describe('getByPatientId', () => {
    it('returns all insurance for a specific patient', async () => {
      (insuranceRepository.findByPatientId as jest.Mock).mockResolvedValue([makeInsurance()]);
      const result = await insuranceService.getByPatientId('p1');
      expect(result).toHaveLength(1);
    });
  });


  describe('update — all optional fields', () => {
    it('updates all optional fields including dates and amounts', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (insuranceRepository.update as jest.Mock).mockResolvedValue(mockIns);

      const result = await insuranceService.update('ins1', 'u1', {
        providerName: 'United Health',
        policyNumber: 'POL-999',
        groupNumber: 'GRP-001',
        subscriberName: 'Bob Smith',
        subscriberRelation: 'spouse',
        planType: 'PPO',
        coverageStartDate: '2024-01-01',
        coverageEndDate: '2024-12-31',
        copayAmount: 30,
        deductibleAmount: 500,
      });

      expect(insuranceRepository.update).toHaveBeenCalledWith(
        mockIns,
        expect.objectContaining({
          groupNumber: 'GRP-001',
          subscriberRelation: 'spouse',
          planType: 'PPO',
          coverageStartDate: expect.any(Date),
          coverageEndDate: expect.any(Date),
          copayAmount: 30,
          deductibleAmount: 500,
        })
      );
      expect(result).toBe(mockIns);
    });

    it('skips undefined optional fields', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      const mockIns = makeInsurance();
      (insuranceRepository.findById as jest.Mock).mockResolvedValue(mockIns);
      (insuranceRepository.update as jest.Mock).mockResolvedValue(mockIns);

      await insuranceService.update('ins1', 'u1', { policyNumber: 'NEW-POL' });

      // groupNumber, planType, etc. should NOT appear in the payload
      const callArg = (insuranceRepository.update as jest.Mock).mock.calls[0][1];
      expect(callArg).not.toHaveProperty('groupNumber');
      expect(callArg).not.toHaveProperty('planType');
      expect(callArg).toHaveProperty('policyNumber', 'NEW-POL');
    });
  });
});
