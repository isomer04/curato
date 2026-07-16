import { Request, Response, NextFunction } from 'express';
import {
  requireRole,
  requireAdmin,
  requireDoctor,
  requirePatient,
  requireDoctorOrAdmin,
} from '../../middleware/role.middleware';
import { UserRole } from '../../types/constants';

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (user?: { userId: string; email: string; role: UserRole }): Request =>
  ({
    user,
  }) as unknown as Request;

describe('role.middleware', () => {
  let next: NextFunction;
  beforeEach(() => {
    next = jest.fn();
  });

  describe('requireRole', () => {
    it('returns 401 when req.user is missing', () => {
      const middleware = requireRole(UserRole.ADMIN);
      const req = mockRequest();
      const res = mockResponse();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when user role does not match', () => {
      const middleware = requireRole(UserRole.ADMIN);
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.PATIENT });
      const res = mockResponse();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when user role matches', () => {
      const middleware = requireRole(UserRole.ADMIN);
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.ADMIN });
      const res = mockResponse();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('accepts any of multiple allowed roles', () => {
      const middleware = requireRole(UserRole.DOCTOR, UserRole.ADMIN);
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.DOCTOR });
      const res = mockResponse();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('convenience middleware', () => {
    it('requireAdmin allows admin', () => {
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.ADMIN });
      const res = mockResponse();
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('requireAdmin rejects doctor', () => {
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.DOCTOR });
      const res = mockResponse();
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('requireDoctor allows doctor', () => {
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.DOCTOR });
      const res = mockResponse();
      requireDoctor(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('requirePatient allows patient', () => {
      const req = mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.PATIENT });
      const res = mockResponse();
      requirePatient(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('requireDoctorOrAdmin allows either role', () => {
      const res1 = mockResponse();
      const res2 = mockResponse();
      requireDoctorOrAdmin(
        mockRequest({ userId: '1', email: 'a@b.com', role: UserRole.DOCTOR }),
        res1,
        next
      );
      requireDoctorOrAdmin(
        mockRequest({ userId: '2', email: 'b@b.com', role: UserRole.ADMIN }),
        res2,
        next
      );
      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});
