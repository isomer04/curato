jest.mock('../../utils/jwt.util', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../models', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { verifyAccessToken } from '../../utils/jwt.util';
import { User } from '../../models';
import { UserRole } from '../../types/constants';
import { OptionallyAuthenticatedRequest } from '../../types/express-augment';

const mockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    ...overrides,
  }) as unknown as Request;

const mockNext: NextFunction = jest.fn();

describe('authMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects request with no authorization header', async () => {
    const req = mockRequest();
    const res = mockResponse();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization header (no Bearer prefix)', async () => {
    const req = mockRequest({ headers: { authorization: 'Token abc123' } });
    const res = mockResponse();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('rejects invalid token', async () => {
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const req = mockRequest({ headers: { authorization: 'Bearer invalid-token' } });
    const res = mockResponse();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('rejects token for non-existent user', async () => {
    (verifyAccessToken as jest.Mock).mockReturnValue({
      userId: 'user-1',
      email: 'test@test.com',
      role: UserRole.PATIENT,
    });
    (User.findByPk as jest.Mock).mockResolvedValue(null);

    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockResponse();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('rejects token for deactivated user', async () => {
    (verifyAccessToken as jest.Mock).mockReturnValue({
      userId: 'user-1',
      email: 'test@test.com',
      role: UserRole.PATIENT,
    });
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      role: UserRole.PATIENT,
      isActive: false,
    });

    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockResponse();

    await authMiddleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('attaches user to request and calls next for valid token', async () => {
    const decoded = { userId: 'user-1', email: 'test@test.com', role: UserRole.PATIENT };
    (verifyAccessToken as jest.Mock).mockReturnValue(decoded);
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      role: UserRole.PATIENT,
      isActive: true,
    });

    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockResponse();

    await authMiddleware(req, res, mockNext);

    expect(req.user).toEqual({
      userId: 'user-1',
      email: 'test@test.com',
      role: UserRole.PATIENT,
    });
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next without user when no header is present', () => {
    const req = mockRequest();
    const res = mockResponse();

    optionalAuthMiddleware(req as unknown as OptionallyAuthenticatedRequest, res, mockNext);

    expect(req.user).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('attaches decoded user when valid token is provided', () => {
    const decoded = { userId: 'user-1', email: 'test@test.com', role: UserRole.PATIENT };
    (verifyAccessToken as jest.Mock).mockReturnValue(decoded);

    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockResponse();

    optionalAuthMiddleware(req as unknown as OptionallyAuthenticatedRequest, res, mockNext);

    expect(req.user).toEqual(decoded);
    expect(mockNext).toHaveBeenCalled();
  });

  it('calls next without user when token is invalid', () => {
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error('expired');
    });

    const req = mockRequest({ headers: { authorization: 'Bearer expired-token' } });
    const res = mockResponse();

    optionalAuthMiddleware(req as unknown as OptionallyAuthenticatedRequest, res, mockNext);

    expect(req.user).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
