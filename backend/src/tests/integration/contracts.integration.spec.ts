import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { UserRole } from '../../types/constants';

// `otplib` pulls in ESM-only transitive deps that Jest (CJS mode) cannot parse.
// This suite doesn't validate MFA internals, so a lightweight mock is sufficient.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'TEST_SECRET'),
  generateURI: jest.fn(() => 'otpauth://totp/test'),
  verifySync: jest.fn(() => ({ valid: true })),
}));

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { userId: 'admin-1', role: UserRole.ADMIN };
    next();
  },
  optionalAuthMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../middleware/role.middleware', () => ({
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireDoctor: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePatient: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireDoctorOrAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePatientOrAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireAuthenticated: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../services/admin.service', () => ({
  adminService: {
    getUsers: jest.fn(),
    getStats: jest.fn(),
    updateUser: jest.fn(),
  },
}));

jest.mock('../../middleware/rateLimit.middleware', () => ({
  rateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  loginRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  registrationRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
  passwordResetRateLimitMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import authRoutes from '../../routes/auth.routes';
import adminRoutes from '../../routes/admin.routes';
import { adminService } from '../../services/admin.service';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);

describe('Integration contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns admin users with paginated response shape', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue({
      users: [
        {
          toSafeObject: () => ({
            id: 'u-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.PATIENT,
            isActive: true,
          }),
        },
      ],
      total: 1,
    });

    const response = await request(app).get('/api/v1/admin/users?page=1&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.metadata).toEqual(
      expect.objectContaining({ page: 1, limit: 10, total: 1, totalPages: 1 })
    );
  });

  it('rejects strict patient registration payloads with unknown fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register/patient')
      .send({
        email: 'newpatient@example.com',
        password: 'StrongPass1!',
        confirmPassword: 'StrongPass1!',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        dateOfBirth: '1998-05-10T00:00:00.000Z',
        gender: 'female',
        address: 'not-allowed-by-schema',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual(expect.objectContaining({ body: expect.any(Array) }));
  });
});
