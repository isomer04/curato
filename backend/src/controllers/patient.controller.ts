import { Response } from 'express';
import { userService } from '../services';
import { successResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import {
  AuthenticatedRequest,
  AuthenticatedBodyRequest,
} from '../types/express-augment';
import type { PatientProfileBody } from '../dto/auth.dto';

export const getPatientProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // After validate middleware, params are validated by userIdValidation schema
  const patientId = req.params['id'];
  const patient = await userService.getPatientById(patientId);

  successResponse(res, { patient });
});

export const updatePatientProfile = asyncHandler(
  async (req: AuthenticatedBodyRequest<PatientProfileBody>, res: Response) => {
    const updateData = req.body;

    const patient = await userService.updatePatientProfile(req.user.userId, updateData);

    successResponse(res, { patient }, 'Profile updated successfully');
  }
);

export const getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getUserById(req.user.userId);

  successResponse(res, { user });
});
