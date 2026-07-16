/* eslint-disable @typescript-eslint/await-thenable */
jest.mock('../../services/admin.service', () => ({
  adminService: {
    getStats: jest.fn(),
    getUsers: jest.fn(),
    updateUser: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    getPendingDoctors: jest.fn(),
    approveDoctor: jest.fn(),
    rejectDoctor: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import {
  getStats,
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  deleteUser,
} from '../../controllers/admin.controller';
import { adminService } from '../../services/admin.service';
import { UserRole } from '../../types/constants';

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    user: { userId: 'admin-1', email: 'admin@test.com', role: UserRole.ADMIN },
    params: {},
    query: {},
    body: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

describe('Admin Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getStats', () => {
    it('returns stats from admin service', async () => {
      const stats = { users: { total: 5 }, appointments: { total: 10 } };
      (adminService.getStats as jest.Mock).mockResolvedValue(stats);

      const req = mockReq();
      const res = mockRes();

      await getStats(req, res, mockNext);

      expect(adminService.getStats).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPendingDoctors', () => {
    it('returns paginated pending doctors', async () => {
      const result = { doctors: [{ id: 'd1' }], total: 1 };
      (adminService.getPendingDoctors as jest.Mock).mockResolvedValue(result);

      // After validate middleware, query params are coerced to numbers
      const req = mockReq({ query: { page: 1, limit: 10 } as unknown as Record<string, string> });
      const res = mockRes();

      await getPendingDoctors(req, res, mockNext);

      expect(adminService.getPendingDoctors).toHaveBeenCalledWith(1, 10);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('approveDoctor', () => {
    it('calls service and returns success', async () => {
      (adminService.approveDoctor as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { id: 'doctor-1' } });
      const res = mockRes();

      await approveDoctor(req, res, mockNext);

      expect(adminService.approveDoctor).toHaveBeenCalledWith('doctor-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('rejectDoctor', () => {
    it('calls service and returns success', async () => {
      (adminService.rejectDoctor as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { id: 'doctor-1' } });
      const res = mockRes();

      await rejectDoctor(req, res, mockNext);

      expect(adminService.rejectDoctor).toHaveBeenCalledWith('doctor-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUser', () => {
    it('prevents admin from deleting their own account', async () => {
      const req = mockReq({ params: { id: 'admin-1' } });
      const res = mockRes();

      await deleteUser(req, res, mockNext);

      // Should forward a BadRequestError to next()
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('cannot delete your own') })
      );
      expect(adminService.deleteUser).not.toHaveBeenCalled();
    });

    it('deletes another user successfully', async () => {
      (adminService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { id: 'other-user' } as Record<string, string> });
      const res = mockRes();

      await deleteUser(req, res, mockNext);

      expect(adminService.deleteUser).toHaveBeenCalledWith('other-user');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
