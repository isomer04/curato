import { Response } from 'express';
import { doctorService, availabilityService } from '../services';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler, ForbiddenError } from '../middleware';
import {
  AuthenticatedRequest,
  TypedQuery,
  AuthenticatedBodyRequest,
  AuthenticatedQueryRequest,
} from '../types/express-augment';
import type { GetDoctorsQuery } from '../dto/user.dto';
import type {
  CreateAvailabilityBody,
  UpdateAvailabilityBody,
  WeeklyScheduleBody,
} from '../dto/availability.dto';
import type { DoctorProfileBody } from '../dto/auth.dto';
import type { DayOfWeek } from '../types/constants';



export const getDoctors = asyncHandler(async (req: TypedQuery<GetDoctorsQuery>, res: Response) => {
  const { page, limit, specialization, search, minRating } = req.query;

  const resolvedPage = page ?? 1;
  const resolvedLimit = limit ?? 10;

  const { doctors, total } = await doctorService.getDoctors({
    page: resolvedPage,
    limit: resolvedLimit,
    specialization,
    search,
    minRating,
  });

  paginatedResponse(res, doctors, total, resolvedPage, resolvedLimit);
});

export const getDoctorById = asyncHandler(async (req: TypedQuery<Record<string, never>>, res: Response) => {
  const { id } = req.params;

  const doctor = await doctorService.getDoctorById(id);

  successResponse(res, { doctor });
});

export const updateDoctorProfile = asyncHandler(
  async (req: AuthenticatedBodyRequest<DoctorProfileBody>, res: Response) => {
    const updateData = req.body;

    const doctor = await doctorService.updateDoctorProfile(req.user.userId, updateData);

    successResponse(res, { doctor }, 'Profile updated successfully');
  }
);

export const getDoctorAvailability = asyncHandler(async (req: TypedQuery<Record<string, never>>, res: Response) => {
  const { id } = req.params;

  const availability = await availabilityService.getByDoctorId(id);

  successResponse(res, { availability });
});

export const getMyAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);

  const availability = await availabilityService.getByDoctorId(doctor.id);

  successResponse(res, { availability });
});

export const createAvailability = asyncHandler(async (req: AuthenticatedBodyRequest<CreateAvailabilityBody>, res: Response) => {
  const { dayOfWeek, startTime, endTime, slotDuration, effectiveFrom, effectiveTo } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user.userId);

  const availability = await availabilityService.create({
    doctorId: doctor.id,
    // Zod validates dayOfWeek against DayOfWeek values — safe to narrow
    dayOfWeek: dayOfWeek as DayOfWeek,
    startTime,
    endTime,
    slotDuration,
    effectiveFrom: effectiveFrom ?? new Date().toISOString().split('T')[0],
    effectiveTo,
  });

  successResponse(res, { availability }, 'Availability created successfully');
});

export const updateAvailability = asyncHandler(async (req: AuthenticatedBodyRequest<UpdateAvailabilityBody>, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Ownership check: verify the availability belongs to the authenticated doctor
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);
  const availability = await availabilityService.getById(id);
  if (availability.doctorId !== doctor.id) {
    throw new ForbiddenError('You do not have permission to modify this availability slot');
  }

  const updated = await availabilityService.update(id, updateData);

  successResponse(res, { availability: updated }, 'Availability updated successfully');
});

export const deleteAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Ownership check: verify the availability belongs to the authenticated doctor
  const doctor = await doctorService.getDoctorByUserId(req.user.userId);
  const availability = await availabilityService.getById(id);
  if (availability.doctorId !== doctor.id) {
    throw new ForbiddenError('You do not have permission to delete this availability slot');
  }

  await availabilityService.delete(id);

  successResponse(res, null, 'Availability deleted successfully');
});

export const setWeeklySchedule = asyncHandler(async (req: AuthenticatedBodyRequest<WeeklyScheduleBody>, res: Response) => {
  const { schedule } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user.userId);

  // All schedule items share the same effectiveFrom from the first entry
  const effectiveFrom = schedule[0].effectiveFrom;

  const availabilities = await availabilityService.setWeeklySchedule(
    doctor.id,
    // Zod validates dayOfWeek against DayOfWeek values — safe to narrow
    schedule as Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration?: number;
    }>,
    effectiveFrom
  );

  successResponse(res, { availabilities }, 'Weekly schedule set successfully');
});

export const getDoctorPatients = asyncHandler(async (req: AuthenticatedQueryRequest<GetDoctorsQuery>, res: Response) => {
  const { page, limit } = req.query;
  const resolvedPage = page ?? 1;
  const resolvedLimit = limit ?? 25;

  const { patients, total } = await doctorService.getDoctorPatients(
    req.user.userId,
    resolvedPage,
    resolvedLimit
  );

  paginatedResponse(res, patients, total, resolvedPage, resolvedLimit);
});
