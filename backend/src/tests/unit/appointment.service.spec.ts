
jest.mock('../../repositories/appointment.repository', () => ({
  appointmentRepository: {
    findById: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findConflicting: jest.fn(),
    findBookedByDoctorAndDate: jest.fn(),
    countByStatus: jest.fn(),
    updateStatusById: jest.fn(),
  },
}));

jest.mock('../../repositories/patient.repository', () => ({
  patientRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('../../repositories/doctor.repository', () => ({
  doctorRepository: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
  },
}));

jest.mock('../../repositories/availability.repository', () => ({
  availabilityRepository: {
    findForDay: jest.fn(),
  },
}));

// Barrel re-export — mirrors what the service actually imports
jest.mock('../../repositories', () => ({
  appointmentRepository: require('../../repositories/appointment.repository').appointmentRepository,
  patientRepository: require('../../repositories/patient.repository').patientRepository,
  doctorRepository: require('../../repositories/doctor.repository').doctorRepository,
  availabilityRepository: require('../../repositories/availability.repository')
    .availabilityRepository,
}));

jest.mock('../../models', () => ({
  Appointment: {},
  MedicalRecord: {
    findOrCreate: jest.fn().mockResolvedValue([
      {
        id: 'medical-record-1',
        notes: null,
        update: jest.fn().mockResolvedValue(undefined),
      },
    ]),
  },
  Prescription: {
    bulkCreate: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn().mockImplementation((cb: (t: object) => Promise<unknown>) =>
      cb({
        // Stub afterCommit so production code that schedules post-commit work
        // (e.g. event emission) executes during the test as if the transaction
        // committed successfully.
        afterCommit: (fn: () => void | Promise<void>) => fn(),
      })
    ),
  },
}));

jest.mock('../../services/notification.service', () => ({
  notificationService: {
    create: jest.fn().mockResolvedValue(undefined),
    createAppointmentNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));


import { appointmentService } from '../../services/appointment.service';
import { appointmentRepository } from '../../repositories/appointment.repository';
import { patientRepository } from '../../repositories/patient.repository';
import { doctorRepository } from '../../repositories/doctor.repository';
import { availabilityRepository } from '../../repositories/availability.repository';
import { UserRole, AppointmentStatus } from '../../types/constants';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors';


const makePatient = (overrides: Record<string, unknown> = {}) => ({
  id: 'patient-1',
  userId: 'user-1',
  user: { id: 'user-1', fullName: 'Alice Patient' },
  ...overrides,
});

const makeDoctor = (overrides: Record<string, unknown> = {}) => ({
  id: 'doctor-1',
  userId: 'user-2',
  user: { id: 'user-2', fullName: 'Dr. Bob' },
  ...overrides,
});

const makeAvailability = (overrides: Record<string, unknown> = {}) => ({
  id: 'avail-1',
  startTime: '08:00',
  endTime: '17:00',
  slotDuration: 30,
  getTimeSlots: jest.fn().mockReturnValue(['08:00', '08:30', '09:00']),
  ...overrides,
});

const makeAppointment = (overrides: Record<string, unknown> = {}) => ({
  id: 'appt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  appointmentDate: new Date('2025-08-01'),
  startTime: '09:00',
  endTime: '09:30',
  reasonForVisit: 'Checkup',
  status: AppointmentStatus.SCHEDULED,
  doctor: { user: { id: 'user-2' } },
  patient: { user: { id: 'user-1' } },
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});


describe('AppointmentService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('create', () => {
    const createInput = {
      userId: 'user-1',
      doctorId: 'doctor-1',
      appointmentDate: '2025-08-01',
      startTime: '09:00',
      reasonForVisit: 'Annual checkup',
    };

    it('create — valid input — creates appointment with SCHEDULED status', async () => {
      const patient = makePatient();
      const doctor = makeDoctor();
      const availability = makeAvailability();
      const appt = makeAppointment();

      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(patient);
      (doctorRepository.findById as jest.Mock).mockResolvedValue(doctor);
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(availability);
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(null);
      (appointmentRepository.create as jest.Mock).mockResolvedValue(appt);

      const result = await appointmentService.create(createInput);

      expect(appointmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          status: AppointmentStatus.SCHEDULED,
        }),
        expect.anything()
      );
      expect(result).toBe(appt);
    });

    it('create — endTime provided — uses supplied endTime instead of calculated value', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(makeAvailability());
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(null);
      const appt = makeAppointment({ endTime: '09:45' });
      (appointmentRepository.create as jest.Mock).mockResolvedValue(appt);

      const result = await appointmentService.create({ ...createInput, endTime: '09:45' });
      expect(result.endTime).toBe('09:45');
    });

    it('create — patient not found — throws NotFoundError', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.create(createInput)).rejects.toThrow(NotFoundError);
    });

    it('create — doctor not found — throws NotFoundError', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.create(createInput)).rejects.toThrow(NotFoundError);
    });

    it('create — no availability for day — throws BadRequestError', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.create(createInput)).rejects.toThrow(BadRequestError);
    });

    it('create — time outside working hours — throws BadRequestError', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      // availability ends at 09:00 — any slot starting at 09:00 with endTime 09:30 exceeds it
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(
        makeAvailability({ startTime: '08:00', endTime: '09:00' })
      );
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.create(createInput)).rejects.toThrow(BadRequestError);
    });

    it('create — slot already booked — throws ConflictError', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(makeAvailability());
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(makeAppointment());

      await expect(appointmentService.create(createInput)).rejects.toThrow(ConflictError);
    });
  });


  describe('getById', () => {
    it('returns appointment when found', async () => {
      const appt = makeAppointment();
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);

      const result = await appointmentService.getById('appt-1');
      expect(result).toBe(appt);
    });

    it('throws NotFoundError when not found', async () => {
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.getById('appt-99')).rejects.toThrow(NotFoundError);
    });
  });


  describe('getByIdForUser', () => {
    it('admin can access any appointment', async () => {
      const appt = makeAppointment();
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);

      const result = await appointmentService.getByIdForUser(
        'appt-1',
        'admin-user',
        UserRole.ADMIN
      );
      expect(result).toBe(appt);
    });

    it('patient can access their own appointment', async () => {
      const appt = makeAppointment();
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      const result = await appointmentService.getByIdForUser('appt-1', 'user-1', UserRole.PATIENT);
      expect(result).toBe(appt);
    });

    it('throws ForbiddenError when patient tries to access another patient appointment', async () => {
      const appt = makeAppointment({ patientId: 'other-patient' });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      await expect(
        appointmentService.getByIdForUser('appt-1', 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(ForbiddenError);
    });

    it('doctor can access their own appointment', async () => {
      const appt = makeAppointment();
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());

      const result = await appointmentService.getByIdForUser('appt-1', 'user-2', UserRole.DOCTOR);
      expect(result).toBe(appt);
    });

    it("throws ForbiddenError when doctor tries to access another doctor's appointment", async () => {
      const appt = makeAppointment({ doctorId: 'other-doctor' });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());

      await expect(
        appointmentService.getByIdForUser('appt-1', 'user-2', UserRole.DOCTOR)
      ).rejects.toThrow(ForbiddenError);
    });
  });


  describe('getAll', () => {
    const paginatedResult = { appointments: [], total: 0 };

    it('patient role resolves own patientId', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.findAll as jest.Mock).mockResolvedValue(paginatedResult);

      await appointmentService.getAll({}, 'user-1', UserRole.PATIENT);

      expect(appointmentRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-1' })
      );
    });

    it('patient not found throws NotFoundError', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.getAll({}, 'user-1', UserRole.PATIENT)).rejects.toThrow(
        NotFoundError
      );
    });

    it('doctor role resolves own doctorId', async () => {
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());
      (appointmentRepository.findAll as jest.Mock).mockResolvedValue(paginatedResult);

      await appointmentService.getAll({}, 'user-2', UserRole.DOCTOR);

      expect(appointmentRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'doctor-1' })
      );
    });

    it('admin uses filters as-is', async () => {
      (appointmentRepository.findAll as jest.Mock).mockResolvedValue(paginatedResult);

      await appointmentService.getAll(
        { status: AppointmentStatus.SCHEDULED },
        'admin',
        UserRole.ADMIN
      );

      expect(appointmentRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: AppointmentStatus.SCHEDULED })
      );
    });
  });


  describe('update', () => {
    it('updates appointment successfully', async () => {
      const appt = makeAppointment();
      const updated = makeAppointment({ reasonForVisit: 'Follow-up' });
      (appointmentRepository.findById as jest.Mock)
        .mockResolvedValueOnce(appt) // first call inside getById during update
        .mockResolvedValueOnce(updated); // second call — reload after update
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await appointmentService.update(
        'appt-1',
        { reasonForVisit: 'Follow-up' },
        'user-1',
        UserRole.PATIENT
      );
      expect(result.reasonForVisit).toBe('Follow-up');
    });

    it('throws BadRequestError when appointment is cancelled', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CANCELLED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      await expect(
        appointmentService.update('appt-1', {}, 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when appointment is completed', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.COMPLETED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      await expect(
        appointmentService.update('appt-1', {}, 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError on date/time change with conflict', async () => {
      const appt = makeAppointment();
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(
        makeAppointment({ id: 'other-appt' })
      );

      await expect(
        appointmentService.update(
          'appt-1',
          { startTime: '10:00', endTime: '10:30' },
          'user-1',
          UserRole.PATIENT
        )
      ).rejects.toThrow(ConflictError);
    });
  });


  describe('cancel', () => {
    it('cancels a scheduled appointment and sends notification', async () => {
      const appt = makeAppointment();
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await appointmentService.cancel(
        'appt-1',
        'Schedule conflict',
        'user-1',
        UserRole.PATIENT
      );
      expect(result).toBe(appt);
      expect(appointmentRepository.update).toHaveBeenCalledWith(
        appt,
        expect.objectContaining({ status: AppointmentStatus.CANCELLED }),
        expect.anything()
      );
    });

    it('throws BadRequestError when already cancelled', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CANCELLED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      await expect(
        appointmentService.cancel('appt-1', 'reason', 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when already completed', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.COMPLETED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());

      await expect(
        appointmentService.cancel('appt-1', 'reason', 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(BadRequestError);
    });
  });


  describe('confirm', () => {
    it('doctor confirms their own scheduled appointment', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.SCHEDULED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await appointmentService.confirm('appt-1', 'user-2', UserRole.DOCTOR);
      expect(result).toBe(appt);
    });

    it('confirm — patient role — throws ForbiddenError', async () => {
      await expect(
        appointmentService.confirm('appt-1', 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when doctor tries to confirm another doctor appointment', async () => {
      const appt = makeAppointment({
        doctorId: 'other-doctor',
        status: AppointmentStatus.SCHEDULED,
      });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());

      await expect(appointmentService.confirm('appt-1', 'user-2', UserRole.DOCTOR)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('throws BadRequestError when appointment is not SCHEDULED', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CONFIRMED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());

      await expect(appointmentService.confirm('appt-1', 'user-2', UserRole.DOCTOR)).rejects.toThrow(
        BadRequestError
      );
    });

    it('admin can confirm any appointment', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.SCHEDULED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await appointmentService.confirm('appt-1', 'admin', UserRole.ADMIN);
      expect(result).toBe(appt);
    });
  });


  describe('complete', () => {
    it('doctor completes a confirmed appointment', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CONFIRMED });
      const reloaded = makeAppointment({ status: AppointmentStatus.COMPLETED });
      (appointmentRepository.findById as jest.Mock)
        .mockResolvedValueOnce(appt)
        .mockResolvedValueOnce(reloaded);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await appointmentService.complete(
        'appt-1',
        'All good',
        undefined,
        'user-2',
        UserRole.DOCTOR
      );
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('complete — patient role — throws ForbiddenError', async () => {
      await expect(
        appointmentService.complete('appt-1', undefined, undefined, 'user-1', UserRole.PATIENT)
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws ForbiddenError when doctor tries to complete another doctor appointment', async () => {
      const appt = makeAppointment({
        doctorId: 'other-doctor',
        status: AppointmentStatus.CONFIRMED,
      });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());

      await expect(
        appointmentService.complete('appt-1', undefined, undefined, 'user-2', UserRole.DOCTOR)
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when appointment status is not completable', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CANCELLED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());

      await expect(
        appointmentService.complete('appt-1', undefined, undefined, 'user-2', UserRole.DOCTOR)
      ).rejects.toThrow(BadRequestError);
    });
  });


  describe('getAvailableSlots', () => {
    it('returns unbooked time slots for a doctor on a date', async () => {
      const avail = makeAvailability({
        getTimeSlots: jest.fn().mockReturnValue(['08:00', '08:30', '09:00']),
        slotDuration: 30,
      });
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(avail);
      // 08:00–08:30 is booked
      (appointmentRepository.findBookedByDoctorAndDate as jest.Mock).mockResolvedValue([
        { startTime: '08:00', endTime: '08:30' },
      ]);

      const slots = await appointmentService.getAvailableSlots('doctor-1', '2025-08-01');

      // 08:30 and 09:00 should be available; 08:00 is taken
      expect(slots).not.toContain('08:00');
      expect(slots.length).toBeGreaterThan(0);
    });

    it('returns empty array when doctor has no availability', async () => {
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(null);

      const slots = await appointmentService.getAvailableSlots('doctor-1', '2025-08-01');
      expect(slots).toEqual([]);
    });

    it('throws NotFoundError when doctor does not exist', async () => {
      (doctorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        appointmentService.getAvailableSlots('bad-doctor', '2025-08-01')
      ).rejects.toThrow(NotFoundError);
    });
  });


  describe('getDashboardStats', () => {
    it('aggregates status counts correctly', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.countByStatus as jest.Mock).mockResolvedValue([
        { status: 'scheduled', count: '3' },
        { status: 'completed', count: '7' },
      ]);

      const stats = await appointmentService.getDashboardStats('user-1');

      expect(stats.scheduled).toBe(3);
      expect(stats.completed).toBe(7);
      expect(stats.confirmed).toBe(0);
      expect(stats.cancelled).toBe(0);
      expect(stats.no_show).toBe(0);
    });

    it('throws NotFoundError when patient not found', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(appointmentService.getDashboardStats('user-1')).rejects.toThrow(NotFoundError);
    });
  });


  describe('create — branch coverage for notification and slotDuration', () => {
    const createInput = {
      userId: 'user-1',
      doctorId: 'doctor-1',
      appointmentDate: '2025-08-01',
      startTime: '09:00',
      reasonForVisit: 'Checkup',
    };

    it('creates appointment without notification when doctor has no user', async () => {
      const doctorNoUser = makeDoctor({ user: null });
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(doctorNoUser);
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(makeAvailability());
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(null);
      const appt = makeAppointment();
      (appointmentRepository.create as jest.Mock).mockResolvedValue(appt);

      const result = await appointmentService.create(createInput);
      expect(result).toBe(appt);
    });

    it('uses DEFAULT_SLOT_DURATION when availability has no slotDuration', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (doctorRepository.findById as jest.Mock).mockResolvedValue(makeDoctor());
      // slotDuration is undefined → fallback to DEFAULT_SLOT_DURATION
      (availabilityRepository.findForDay as jest.Mock).mockResolvedValue(
        makeAvailability({ slotDuration: undefined })
      );
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(null);
      (appointmentRepository.create as jest.Mock).mockResolvedValue(makeAppointment());

      const result = await appointmentService.create(createInput);
      expect(result).toBeDefined();
    });
  });

  describe('cancel — branch coverage for doctor cancel and missing notifyUserId', () => {
    it('doctor cancels — notifies patient (userRole !== PATIENT path)', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.SCHEDULED });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(appt);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(makeDoctor());
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      await appointmentService.cancel('appt-1', 'Doctor unavailable', 'user-2', UserRole.DOCTOR);

      expect(appointmentRepository.update).toHaveBeenCalledWith(
        appt,
        expect.objectContaining({ status: AppointmentStatus.CANCELLED }),
        expect.anything()
      );
    });

    it('cancel without doctor user — no notification, no throw', async () => {
      const apptNoPatientUser = makeAppointment({
        status: AppointmentStatus.SCHEDULED,
        patient: { user: null },
        doctor: { user: null },
      });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(apptNoPatientUser);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      // Should complete without throwing even when notifyUserId is falsy
      await expect(
        appointmentService.cancel('appt-1', 'reason', 'user-1', UserRole.PATIENT)
      ).resolves.toBeDefined();
    });
  });

  describe('confirm — branch coverage for patient notification', () => {
    it('admin confirm without patient user — no notification, no throw', async () => {
      const apptNoPatient = makeAppointment({
        status: AppointmentStatus.SCHEDULED,
        patient: null,
      });
      (appointmentRepository.findById as jest.Mock).mockResolvedValue(apptNoPatient);
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      await expect(
        appointmentService.confirm('appt-1', 'admin', UserRole.ADMIN)
      ).resolves.toBeDefined();
    });
  });

  describe('update — branch coverage for appointmentDate conversion', () => {
    it('converts appointmentDate string to Date when provided', async () => {
      const appt = makeAppointment();
      const updated = makeAppointment({ appointmentDate: new Date('2025-09-15') });
      (appointmentRepository.findById as jest.Mock)
        .mockResolvedValueOnce(appt)
        .mockResolvedValueOnce(updated);
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(makePatient());
      (appointmentRepository.findConflicting as jest.Mock).mockResolvedValue(null);
      (appointmentRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await appointmentService.update(
        'appt-1',
        { appointmentDate: '2025-09-15' },
        'user-1',
        UserRole.PATIENT
      );
      expect(result).toBeDefined();
      expect(appointmentRepository.update).toHaveBeenCalledWith(
        appt,
        expect.objectContaining({ appointmentDate: expect.any(Date) })
      );
    });
  });
});
