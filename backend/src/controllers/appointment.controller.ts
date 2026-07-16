import { Response } from 'express';
import { appointmentService } from '../services';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import {
  AuthenticatedRequest,
  AuthenticatedBodyRequest,
  AuthenticatedQueryRequest,
} from '../types/express-augment';
import type {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  CancelAppointmentBody,
  CompleteAppointmentBody,
  GetAppointmentsQuery,
  AvailableSlotsQuery,
} from '../dto/appointment.dto';

export const createAppointment = asyncHandler(
  async (req: AuthenticatedBodyRequest<CreateAppointmentBody>, res: Response) => {
    const { doctorId, appointmentDate, startTime, endTime, reasonForVisit } = req.body;

    const appointment = await appointmentService.create({
      userId: req.user.userId,
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      reasonForVisit,
    });

    createdResponse(res, { appointment }, 'Appointment created successfully');
  }
);

export const getAppointments = asyncHandler(
  async (req: AuthenticatedQueryRequest<GetAppointmentsQuery>, res: Response) => {
    const { page, limit, status, startDate, endDate, doctorId, patientId } = req.query;

    const resolvedPage = page ?? 1;
    const resolvedLimit = limit ?? 10;

    const { appointments, total } = await appointmentService.getAll(
      {
        page: resolvedPage,
        limit: resolvedLimit,
        status,
        startDate,
        endDate,
        doctorId,
        patientId,
      },
      req.user.userId,
      req.user.role
    );

    paginatedResponse(res, appointments, total, resolvedPage, resolvedLimit);
  }
);

export const getAppointmentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Use role-aware lookup to prevent PHI leakage across patients/doctors
  const appointment = await appointmentService.getByIdForUser(id, req.user.userId, req.user.role);

  successResponse(res, { appointment });
});

export const updateAppointment = asyncHandler(
  async (req: AuthenticatedBodyRequest<UpdateAppointmentBody>, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;

    const appointment = await appointmentService.update(
      id,
      updateData,
      req.user.userId,
      req.user.role
    );

    successResponse(res, { appointment }, 'Appointment updated successfully');
  }
);

export const cancelAppointment = asyncHandler(
  async (req: AuthenticatedBodyRequest<CancelAppointmentBody>, res: Response) => {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await appointmentService.cancel(
      id,
      cancellationReason,
      req.user.userId,
      req.user.role
    );

    successResponse(res, { appointment }, 'Appointment cancelled successfully');
  }
);

export const confirmAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const appointment = await appointmentService.confirm(id, req.user.userId, req.user.role);

  successResponse(res, { appointment }, 'Appointment confirmed successfully');
});

export const completeAppointment = asyncHandler(
  async (req: AuthenticatedBodyRequest<CompleteAppointmentBody>, res: Response) => {
    const { id } = req.params;
    const { notes, prescriptions } = req.body;

    const appointment = await appointmentService.complete(
      id,
      notes,
      prescriptions,
      req.user.userId,
      req.user.role
    );

    successResponse(res, { appointment }, 'Appointment completed successfully');
  }
);

export const getAvailableSlots = asyncHandler(
  async (req: AuthenticatedQueryRequest<AvailableSlotsQuery>, res: Response) => {
    const { doctorId, date } = req.query;

    const slots = await appointmentService.getAvailableSlots(doctorId, date);

    successResponse(res, { slots });
  }
);

/**
 * Return pre-aggregated appointment counts per status for the patient dashboard.
 * Much lighter than fetching all appointment records just to count them.
 */
export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await appointmentService.getDashboardStats(req.user.userId);
  successResponse(res, { stats });
});
