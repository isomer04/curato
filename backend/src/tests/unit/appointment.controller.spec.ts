

jest.mock('../../services/appointment.service', () => ({
  appointmentService: {
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    getByIdForUser: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    confirm: jest.fn(),
    complete: jest.fn(),
    getAvailableSlots: jest.fn(),
    getDashboardStats: jest.fn(),
  },
}));

jest.mock('../../services', () => ({
  appointmentService: require('../../services/appointment.service').appointmentService,
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));


import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import * as appointmentController from '../../controllers/appointment.controller';
import { appointmentService } from '../../services/appointment.service';
import { UserRole, AppointmentStatus } from '../../types/constants';


const PATIENT_ID = '7ca0f8f8-3e5e-49b2-a42e-13c54460775d';
const DOCTOR_ID = '123e4567-e89b-12d3-a456-426614174000';
const APPOINTMENT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const OTHER_ID = 'a47ac10b-58cc-4372-a567-0e02b2c3d470';

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    user: { userId: PATIENT_ID, email: 'patient@test.com', role: UserRole.PATIENT },
    params: {},
    query: {},
    body: {},
    cookies: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

const makeAppointment = (overrides = {}) => ({
  id: APPOINTMENT_ID,
  doctorId: DOCTOR_ID,
  patientId: PATIENT_ID,
  appointmentDate: '2026-05-01',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reasonForVisit: 'Annual check-up routine illness',
  ...overrides,
});


describe('Appointment Controller', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('createAppointment', () => {
    const body = {
      doctorId: DOCTOR_ID,
      appointmentDate: '2026-05-01',
      startTime: '09:00',
      endTime: '09:30',
      reasonForVisit: 'Annual check-up routine illness',
    };

    it('happy path — creates appointment and returns 201', async () => {
      const appt = makeAppointment();
      (appointmentService.create as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({ body });
      const res = mockRes();

      await appointmentController.createAppointment(req, res, mockNext);

      expect(appointmentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: PATIENT_ID,
          doctorId: body.doctorId,
          reasonForVisit: body.reasonForVisit,
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('forwards service errors to next()', async () => {
      const err = new Error('slot conflict');
      (appointmentService.create as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body });
      const res = mockRes();

      await appointmentController.createAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getAppointments', () => {
    it('happy path — returns paginated appointments with 200', async () => {
      const result = { appointments: [makeAppointment()], total: 1 };
      (appointmentService.getAll as jest.Mock).mockResolvedValue(result);
      const req = mockReq({ query: { page: 1, limit: 10 } as unknown as Record<string, string> });
      const res = mockRes();

      await appointmentController.getAppointments(req, res, mockNext);

      expect(appointmentService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        PATIENT_ID,
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('passes status filter when provided', async () => {
      (appointmentService.getAll as jest.Mock).mockResolvedValue({ appointments: [], total: 0 });
      const req = mockReq({
        query: { status: AppointmentStatus.SCHEDULED } as Record<string, string>,
      });
      const res = mockRes();

      await appointmentController.getAppointments(req, res, mockNext);

      expect(appointmentService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: AppointmentStatus.SCHEDULED }),
        PATIENT_ID,
        UserRole.PATIENT
      );
    });

    it('uses default pagination when page/limit not provided', async () => {
      (appointmentService.getAll as jest.Mock).mockResolvedValue({ appointments: [], total: 0 });
      const req = mockReq({ query: {} });
      const res = mockRes();

      await appointmentController.getAppointments(req, res, mockNext);

      expect(appointmentService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        PATIENT_ID,
        UserRole.PATIENT
      );
    });
  });


  describe('getAppointmentById', () => {
    it('happy path — returns appointment with 200', async () => {
      const appt = makeAppointment();
      (appointmentService.getByIdForUser as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({ params: { id: APPOINTMENT_ID } });
      const res = mockRes();

      await appointmentController.getAppointmentById(req, res, mockNext);

      expect(appointmentService.getByIdForUser).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        PATIENT_ID,
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards ForbiddenError to next() when accessing another patient appointment', async () => {
      const err = new Error('forbidden');
      (appointmentService.getByIdForUser as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { id: OTHER_ID } });
      const res = mockRes();

      await appointmentController.getAppointmentById(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('updateAppointment', () => {
    it('happy path — updates appointment and returns 200', async () => {
      const appt = makeAppointment();
      (appointmentService.update as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        params: { id: APPOINTMENT_ID },
        body: { reasonForVisit: 'Updated reason here because it needs to be long enough' },
      });
      const res = mockRes();

      await appointmentController.updateAppointment(req, res, mockNext);

      expect(appointmentService.update).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        expect.objectContaining({ reasonForVisit: 'Updated reason here because it needs to be long enough' }),
        PATIENT_ID,
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('cannot update cancelled');
      (appointmentService.update as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { id: APPOINTMENT_ID }, body: { reasonForVisit: 'Some long enough reason for update here' } });
      const res = mockRes();

      await appointmentController.updateAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('cancelAppointment', () => {
    it('happy path — cancels appointment and returns 200', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CANCELLED });
      (appointmentService.cancel as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        params: { id: APPOINTMENT_ID },
        body: { cancellationReason: 'No longer needed because I am feeling better now' },
      });
      const res = mockRes();

      await appointmentController.cancelAppointment(req, res, mockNext);

      expect(appointmentService.cancel).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        'No longer needed because I am feeling better now',
        PATIENT_ID,
        UserRole.PATIENT
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards already-cancelled error to next()', async () => {
      const err = new Error('already cancelled');
      (appointmentService.cancel as jest.Mock).mockRejectedValue(err);
      const req = mockReq({
        params: { id: APPOINTMENT_ID },
        body: { cancellationReason: 'Test reason for cancellation that is long enough' },
      });
      const res = mockRes();

      await appointmentController.cancelAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('confirmAppointment', () => {
    it('doctor confirms appointment — returns 200', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.CONFIRMED });
      (appointmentService.confirm as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        user: { userId: DOCTOR_ID, email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: APPOINTMENT_ID },
      });
      const res = mockRes();

      await appointmentController.confirmAppointment(req, res, mockNext);

      expect(appointmentService.confirm).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        DOCTOR_ID,
        UserRole.DOCTOR
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards ForbiddenError to next() for patient role', async () => {
      const err = new Error('forbidden');
      (appointmentService.confirm as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { id: APPOINTMENT_ID } });
      const res = mockRes();

      await appointmentController.confirmAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('completeAppointment', () => {
    it('doctor completes appointment with notes and returns 200', async () => {
      const appt = makeAppointment({ status: AppointmentStatus.COMPLETED });
      (appointmentService.complete as jest.Mock).mockResolvedValue(appt);
      const req = mockReq({
        user: { userId: DOCTOR_ID, email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: APPOINTMENT_ID },
        body: { notes: 'Patient is healthy', prescriptions: [] },
      });
      const res = mockRes();

      await appointmentController.completeAppointment(req, res, mockNext);

      expect(appointmentService.complete).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        'Patient is healthy',
        [],
        DOCTOR_ID,
        UserRole.DOCTOR
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('completes without notes or prescriptions (uses default messages or empty)', async () => {
      (appointmentService.complete as jest.Mock).mockResolvedValue(makeAppointment());
      const req = mockReq({
        user: { userId: DOCTOR_ID, email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: APPOINTMENT_ID },
        body: { notes: 'No problems detected' },
      });
      const res = mockRes();

      await appointmentController.completeAppointment(req, res, mockNext);

      expect(appointmentService.complete).toHaveBeenCalledWith(
        APPOINTMENT_ID,
        'No problems detected',
        undefined,
        DOCTOR_ID,
        UserRole.DOCTOR
      );
    });

    it('forwards errors to next()', async () => {
      const err = new Error('not completable');
      (appointmentService.complete as jest.Mock).mockRejectedValue(err);
      const req = mockReq({
        user: { userId: DOCTOR_ID, email: 'doc@test.com', role: UserRole.DOCTOR },
        params: { id: APPOINTMENT_ID },
        body: { notes: 'Some notes here' },
      });
      const res = mockRes();

      await appointmentController.completeAppointment(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getAvailableSlots', () => {
    it('returns available slots for a doctor on a date with 200', async () => {
      const slots = [{ startTime: '09:00', endTime: '09:30' }];
      (appointmentService.getAvailableSlots as jest.Mock).mockResolvedValue(slots);
      const req = mockReq({
        query: { doctorId: DOCTOR_ID, date: '2026-05-01' } as Record<string, string>,
      });
      const res = mockRes();

      await appointmentController.getAvailableSlots(req, res, mockNext);

      expect(appointmentService.getAvailableSlots).toHaveBeenCalledWith(
        DOCTOR_ID,
        '2026-05-01'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('doctor not found');
      (appointmentService.getAvailableSlots as jest.Mock).mockRejectedValue(err);
      const req = mockReq({
        query: { doctorId: DOCTOR_ID, date: '2026-05-01' } as Record<string, string>,
      });
      const res = mockRes();

      await appointmentController.getAvailableSlots(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getDashboardStats', () => {
    it('returns dashboard stats for the authenticated user with 200', async () => {
      const stats = { scheduled: 2, confirmed: 1, completed: 5, cancelled: 0 };
      (appointmentService.getDashboardStats as jest.Mock).mockResolvedValue(stats);
      const req = mockReq();
      const res = mockRes();

      await appointmentController.getDashboardStats(req, res, mockNext);

      expect(appointmentService.getDashboardStats).toHaveBeenCalledWith(PATIENT_ID);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards NotFoundError to next()', async () => {
      const err = new Error('patient not found');
      (appointmentService.getDashboardStats as jest.Mock).mockRejectedValue(err);
      const req = mockReq();
      const res = mockRes();

      await appointmentController.getDashboardStats(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
