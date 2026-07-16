jest.mock('../../repositories/availability.repository', () => ({
  availabilityRepository: {
    findById: jest.fn(),
    findByDoctorId: jest.fn(),
    findOverlapping: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deactivateAll: jest.fn(),
    doctorExists: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn().mockImplementation((cb: (t: object) => unknown) => cb({})),
  },
}));

import { availabilityService } from '../../services/availability.service';
import { availabilityRepository } from '../../repositories/availability.repository';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { DayOfWeek } from '../../types/constants';

const makeAvailability = (overrides: Record<string, unknown> = {}) => ({
  id: 'av1',
  doctorId: 'd1',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: 30,
  isActive: true,
  effectiveFrom: new Date('2024-01-01'),
  effectiveTo: null,
  update: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('AvailabilityService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('create', () => {
    const payload = {
      doctorId: 'd1',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '17:00',
      effectiveFrom: '2024-01-01',
    };

    it('happy path — creates availability record', async () => {
      const mockAv = makeAvailability();
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(true);
      (availabilityRepository.findOverlapping as jest.Mock).mockResolvedValue(null);
      (availabilityRepository.create as jest.Mock).mockResolvedValue(mockAv);

      const result = await availabilityService.create(payload);

      expect(availabilityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'd1', dayOfWeek: DayOfWeek.MONDAY })
      );
      expect(result).toBe(mockAv);
    });

    it('uses default slotDuration of 30 when not provided', async () => {
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(true);
      (availabilityRepository.findOverlapping as jest.Mock).mockResolvedValue(null);
      (availabilityRepository.create as jest.Mock).mockResolvedValue(makeAvailability());

      await availabilityService.create(payload);

      expect(availabilityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slotDuration: 30 })
      );
    });

    it('throws NotFoundError when doctor does not exist', async () => {
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(false);
      await expect(availabilityService.create(payload)).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when overlapping availability exists', async () => {
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(true);
      (availabilityRepository.findOverlapping as jest.Mock).mockResolvedValue(makeAvailability());
      await expect(availabilityService.create(payload)).rejects.toThrow(ConflictError);
    });

    it('passes effectiveTo to repository when provided', async () => {
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(true);
      (availabilityRepository.findOverlapping as jest.Mock).mockResolvedValue(null);
      (availabilityRepository.create as jest.Mock).mockResolvedValue(makeAvailability());

      await availabilityService.create({ ...payload, effectiveTo: '2024-12-31' });

      expect(availabilityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ effectiveTo: expect.any(Date) })
      );
    });
  });


  describe('getByDoctorId', () => {
    it('returns list of availabilities', async () => {
      const mockAv = makeAvailability();
      (availabilityRepository.findByDoctorId as jest.Mock).mockResolvedValue([mockAv]);
      const result = await availabilityService.getByDoctorId('d1');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no availabilities exist', async () => {
      (availabilityRepository.findByDoctorId as jest.Mock).mockResolvedValue([]);
      const result = await availabilityService.getByDoctorId('d1');
      expect(result).toHaveLength(0);
    });
  });


  describe('getById', () => {
    it('returns availability when found', async () => {
      const mockAv = makeAvailability();
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(mockAv);
      const result = await availabilityService.getById('av1');
      expect(result).toBe(mockAv);
    });

    it('throws NotFoundError when not found', async () => {
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(availabilityService.getById('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('update', () => {
    it('happy path — updates availability', async () => {
      const mockAv = makeAvailability();
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(mockAv);
      (availabilityRepository.update as jest.Mock).mockResolvedValue(mockAv);

      const result = await availabilityService.update('av1', { startTime: '10:00' });

      expect(availabilityRepository.update).toHaveBeenCalledWith(
        mockAv,
        expect.objectContaining({ startTime: '10:00' })
      );
      expect(result).toBe(mockAv);
    });

    it('converts effectiveTo string to Date', async () => {
      const mockAv = makeAvailability();
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(mockAv);
      (availabilityRepository.update as jest.Mock).mockResolvedValue(mockAv);

      await availabilityService.update('av1', { effectiveTo: '2024-12-31' });

      expect(availabilityRepository.update).toHaveBeenCalledWith(
        mockAv,
        expect.objectContaining({ effectiveTo: expect.any(Date) })
      );
    });

    it('throws NotFoundError when availability not found', async () => {
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(availabilityService.update('ghost', {})).rejects.toThrow(NotFoundError);
    });
  });


  describe('delete', () => {
    it('deletes availability', async () => {
      const mockAv = makeAvailability();
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(mockAv);
      (availabilityRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await availabilityService.delete('av1');

      expect(availabilityRepository.delete).toHaveBeenCalledWith(mockAv);
    });

    it('throws NotFoundError when availability not found', async () => {
      (availabilityRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(availabilityService.delete('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('setWeeklySchedule', () => {
    const schedule = [
      { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '17:00' },
    ];

    it('deactivates existing and creates new schedule', async () => {
      const createdSlots = [makeAvailability(), makeAvailability({ id: 'av2', dayOfWeek: DayOfWeek.TUESDAY })];
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(true);
      (availabilityRepository.deactivateAll as jest.Mock).mockResolvedValue(undefined);
      (availabilityRepository.bulkCreate as jest.Mock).mockResolvedValue(createdSlots);

      const result = await availabilityService.setWeeklySchedule('d1', schedule, '2024-03-01');

      expect(availabilityRepository.deactivateAll).toHaveBeenCalledWith('d1', expect.any(Date), expect.anything());
      expect(availabilityRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ doctorId: 'd1', dayOfWeek: DayOfWeek.MONDAY }),
        ]),
        expect.anything()
      );
      expect(result).toHaveLength(2);
    });

    it('throws NotFoundError when doctor does not exist', async () => {
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(false);
      await expect(
        availabilityService.setWeeklySchedule('d1', schedule, '2024-03-01')
      ).rejects.toThrow(NotFoundError);
    });

    it('returns empty array for empty schedule', async () => {
      (availabilityRepository.doctorExists as jest.Mock).mockResolvedValue(true);
      (availabilityRepository.deactivateAll as jest.Mock).mockResolvedValue(undefined);
      (availabilityRepository.bulkCreate as jest.Mock).mockResolvedValue([]);

      const result = await availabilityService.setWeeklySchedule('d1', [], '2024-03-01');
      expect(result).toHaveLength(0);
    });
  });
});
