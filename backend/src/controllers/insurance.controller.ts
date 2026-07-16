import { Response } from 'express';
import { insuranceService } from '../services';
import { asyncHandler } from '../middleware';
import { successResponse, createdResponse } from '../utils/response.util';
import {
  AuthenticatedRequest,
  AuthenticatedBodyRequest,
} from '../types/express-augment';
import type {
  CreateInsuranceBody,
  UpdateInsuranceBody,
  VerifyInsuranceBody,
} from '../dto/insurance.dto';

// POST /api/v1/insurance
export const createInsurance = asyncHandler(async (req: AuthenticatedBodyRequest<CreateInsuranceBody>, res: Response) => {
  const data = req.body;

  const insurance = await insuranceService.create(
    req.user.userId,
    data
  );
  createdResponse(res, { insurance }, 'Insurance record created successfully');
});

// GET /api/v1/insurance
export const getMyInsurance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const insurances = await insuranceService.getAll(req.user.userId);
  successResponse(res, { insurances });
});

// GET /api/v1/insurance/active
export const getActiveInsurance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const insurance = await insuranceService.getActive(req.user.userId);
  successResponse(res, { hasActiveInsurance: !!insurance, insurance: insurance ?? null });
});

// GET /api/v1/insurance/:id
export const getInsuranceById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const insurance = await insuranceService.getById(req.params['id'], req.user.userId, req.user.role);
  successResponse(res, { insurance });
});

// PUT /api/v1/insurance/:id
export const updateInsurance = asyncHandler(async (req: AuthenticatedBodyRequest<UpdateInsuranceBody>, res: Response) => {
  const data = req.body;

  const insurance = await insuranceService.update(
    req.params['id'],
    req.user.userId,
    data
  );
  successResponse(res, { insurance }, 'Insurance record updated successfully');
});

// POST /api/v1/insurance/:id/verify  (admin only)
export const verifyInsurance = asyncHandler(async (req: AuthenticatedBodyRequest<VerifyInsuranceBody>, res: Response) => {
  const data = req.body;

  const insurance = await insuranceService.verify(
    req.params['id'],
    data
  );
  successResponse(
    res,
    { insurance },
    `Insurance verification status updated to: ${insurance.verificationStatus}`
  );
});

// POST /api/v1/insurance/:id/deactivate
export const deactivateInsurance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const insurance = await insuranceService.deactivate(req.params['id'], req.user.userId);
  successResponse(res, { insurance }, 'Insurance record deactivated');
});

// DELETE /api/v1/insurance/:id
export const deleteInsurance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await insuranceService.delete(req.params['id'], req.user.userId);
  successResponse(res, undefined, 'Insurance record deleted');
});

// GET /api/v1/insurance/patient/:patientId  (admin only)
export const getPatientInsurance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const insurances = await insuranceService.getByPatientId(req.params['patientId']);
  successResponse(res, { insurances });
});
