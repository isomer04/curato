jest.mock('../../repositories/doctor.repository', () => ({
  doctorRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { doctorService } from '../../services/doctor.service';
import { doctorRepository } from '../../repositories/doctor.repository';
import { NotFoundError } from '../../shared/errors';
import { Doctor } from '../../models';

const makeDoctor = (overrides: Record<string, unknown> = {}) => ({
  id: 'd1',
  userId: 'u1',
  specialization: 'Cardiology',
  licenseNumber: 'LIC-001',
  rating: 4.5,
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('DoctorService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('getDoctors', () => {
    it('returns list of doctors', async () => {
      (doctorRepository.findAll as jest.Mock).mockResolvedValue({
        doctors: [makeDoctor()],
        total: 1,
      });
      const result = await doctorService.getDoctors({});
      expect(result.total).toBe(1);
      expect(result.doctors).toHaveLength(1);
    });

    it('passes filters to repository', async () => {
      (doctorRepository.findAll as jest.Mock).mockResolvedValue({ doctors: [], total: 0 });
      await doctorService.getDoctors({ specialization: 'Neurology', page: 2, limit: 5 });
      expect(doctorRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ specialization: 'Neurology', page: 2, limit: 5 })
      );
    });

    it('returns empty list when no doctors match filters', async () => {
      (doctorRepository.findAll as jest.Mock).mockResolvedValue({ doctors: [], total: 0 });
      const result = await doctorService.getDoctors({ specialization: 'Unobtanium' });
      expect(result.total).toBe(0);
      expect(result.doctors).toHaveLength(0);
    });

    it('supports search and minRating filters', async () => {
      (doctorRepository.findAll as jest.Mock).mockResolvedValue({ doctors: [], total: 0 });
      await doctorService.getDoctors({ search: 'Dr. Smith', minRating: 4.0 });
      expect(doctorRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Dr. Smith', minRating: 4.0 })
      );
    });
  });


  describe('getDoctorById', () => {
    it('returns doctor when found', async () => {
      const mockDoctor = makeDoctor();
      (doctorRepository.findById as jest.Mock).mockResolvedValue(mockDoctor);
      const result = await doctorService.getDoctorById('d1');
      expect(result).toBe(mockDoctor);
      expect(doctorRepository.findById).toHaveBeenCalledWith('d1', { withUser: true });
    });

    it('throws NotFoundError when doctor not found', async () => {
      (doctorRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(doctorService.getDoctorById('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('getDoctorByUserId', () => {
    it('returns doctor when found by userId', async () => {
      const mockDoctor = makeDoctor();
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(mockDoctor);
      const result = await doctorService.getDoctorByUserId('u1');
      expect(result).toBe(mockDoctor);
      expect(doctorRepository.findByUserId).toHaveBeenCalledWith('u1', { withUser: true });
    });

    it('throws NotFoundError when doctor profile not found', async () => {
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      await expect(doctorService.getDoctorByUserId('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('updateDoctorProfile', () => {
    it('happy path — updates profile and returns refreshed doctor', async () => {
      const mockDoctor = makeDoctor();
      const updatedDoctor = makeDoctor({ specialization: 'Neurology' });
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(mockDoctor);
      (doctorRepository.findById as jest.Mock).mockResolvedValue(updatedDoctor);

      const result = await doctorService.updateDoctorProfile('u1', {
        specialization: 'Neurology',
      } as Partial<Doctor>);

      expect(doctorRepository.update).toHaveBeenCalledWith(
        mockDoctor,
        expect.objectContaining({ specialization: 'Neurology' })
      );
      expect(result).toBe(updatedDoctor);
    });

    it('throws NotFoundError when doctor not found', async () => {
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      await expect(doctorService.updateDoctorProfile('ghost', {})).rejects.toThrow(NotFoundError);
    });
  });
});
