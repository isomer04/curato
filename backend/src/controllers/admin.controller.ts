import { Response } from 'express';
import { asyncHandler } from '../middleware';
import { paginatedResponse, successResponse, createdResponse } from '../utils/response.util';
import { adminService } from '../services/admin.service';
import { BadRequestError } from '../shared/errors';
import {
  AuthenticatedRequest,
  AuthenticatedBodyRequest,
  AuthenticatedQueryRequest,
} from '../types/express-augment';
import type {
  AdminUsersQuery,
  AdminUserPatchBody,
  AdminCreateUserBody,
  AdminPendingDoctorsQuery,
} from '../dto/admin.dto';

export const getStats = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const stats = await adminService.getStats();
  successResponse(res, { stats });
});

export const getUsers = asyncHandler(async (req: AuthenticatedQueryRequest<AdminUsersQuery>, res: Response) => {
  const { role, isActive, search, page, limit } = req.query;

  const { users, total } = await adminService.getUsers({
    role,
    isActive,
    search,
    page,
    limit,
  });

  paginatedResponse(
    res,
    users.map(user => user.toSafeObject()),
    total,
    page,
    limit,
    'Users retrieved'
  );
});

export const updateUser = asyncHandler(async (req: AuthenticatedBodyRequest<AdminUserPatchBody>, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  await adminService.updateUser(id, data);
  successResponse(res, null, 'User updated successfully');
});

export const createUser = asyncHandler(async (req: AuthenticatedBodyRequest<AdminCreateUserBody>, res: Response) => {
  const data = req.body;

  const user = await adminService.createUser(data);
  createdResponse(res, { user: user.toSafeObject() }, 'User created successfully');
});

export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.user.userId === id) {
    throw new BadRequestError('You cannot delete your own account');
  }
  await adminService.deleteUser(id);
  successResponse(res, null, 'User deleted successfully');
});

export const getPendingDoctors = asyncHandler(async (req: AuthenticatedQueryRequest<AdminPendingDoctorsQuery>, res: Response) => {
  const { page, limit } = req.query;

  const { doctors, total } = await adminService.getPendingDoctors(page, limit);
  paginatedResponse(res, doctors, total, page, limit, 'Pending doctors retrieved');
});

export const approveDoctor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await adminService.approveDoctor(id);
  successResponse(res, null, 'Doctor approved successfully');
});

export const rejectDoctor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await adminService.rejectDoctor(id);
  successResponse(res, null, 'Doctor registration rejected');
});
