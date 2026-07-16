
jest.mock('../../services/auth.service', () => ({
  authService: {
    register: jest.fn(),
    registerPatient: jest.fn(),
    registerDoctor: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    changePassword: jest.fn(),
    getUserById: jest.fn(),
    setupMfa: jest.fn(),
    verifySetupMfa: jest.fn(),
    verifyMfaLogin: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  },
}));

// Also mock the barrel so `import { authService } from '../services'` resolves
jest.mock('../../services', () => ({
  authService: require('../../services/auth.service').authService,
}));

jest.mock('../../utils/cookie.util', () => ({
  REFRESH_TOKEN_COOKIE: 'refreshToken',
  setRefreshTokenCookie: jest.fn(),
  clearRefreshTokenCookie: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));


import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import * as authController from '../../controllers/auth.controller';
import { authService } from '../../services/auth.service';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../../utils/cookie.util';
import { UserRole, Gender } from '../../types/constants';


const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    user: { userId: 'user-uuid', email: 'test@example.com', role: UserRole.PATIENT },
    params: {},
    query: {},
    body: {},
    cookies: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

const SAFE_USER = { id: 'user-uuid', email: 'test@example.com' };
const TOKENS = {
  user: SAFE_USER,
  accessToken: 'acc-token',
  refreshToken: 'ref-token',
};


describe('Auth Controller', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('register', () => {
    const body = {
      email: 'new@example.com',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
      firstName: 'Alice',
      lastName: 'Smith',
      role: UserRole.PATIENT,
    };

    it('happy path — calls authService.register, sets cookie, returns 201', async () => {
      (authService.register as jest.Mock).mockResolvedValue(TOKENS);
      const req = mockReq({ body });
      const res = mockRes();

      await authController.register(req, res, mockNext);

      expect(authService.register).toHaveBeenCalled();
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, TOKENS.refreshToken);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('forwards service errors to next()', async () => {
      const err = new Error('conflict');
      (authService.register as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body });
      const res = mockRes();

      await authController.register(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('registerPatient', () => {
    const body = {
      email: 'patient@example.com',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
      firstName: 'Alice',
      lastName: 'Smith',
      dateOfBirth: '1990-01-01T00:00:00Z',
      gender: Gender.FEMALE,
    };

    it('happy path — calls authService.registerPatient, sets cookie, returns 201', async () => {
      (authService.registerPatient as jest.Mock).mockResolvedValue(TOKENS);
      const req = mockReq({ body });
      const res = mockRes();

      await authController.registerPatient(req, res, mockNext);

      expect(authService.registerPatient).toHaveBeenCalled();
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, TOKENS.refreshToken);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });


  describe('registerDoctor', () => {
    const body = {
      email: 'doc@example.com',
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!',
      firstName: 'Bob',
      lastName: 'Doctor',
      specialization: 'Cardiology',
      licenseNumber: 'MD-12345',
    };

    it('happy path — calls authService.registerDoctor, sets cookie, returns 201', async () => {
      (authService.registerDoctor as jest.Mock).mockResolvedValue(TOKENS);
      const req = mockReq({ body });
      const res = mockRes();

      await authController.registerDoctor(req, res, mockNext);

      expect(authService.registerDoctor).toHaveBeenCalled();
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, TOKENS.refreshToken);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });


  describe('login', () => {
    const body = { email: 'test@example.com', password: 'StrongPass1!' };

    it('happy path — sets cookie and returns 200 with user + accessToken', async () => {
      (authService.login as jest.Mock).mockResolvedValue(TOKENS);
      const req = mockReq({ body });
      const res = mockRes();

      await authController.login(req, res, mockNext);

      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, TOKENS.refreshToken, true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns mfaRequired=true without setting cookie when MFA is enabled', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        mfaRequired: true,
        tempToken: 'temp-token',
      });
      const req = mockReq({ body });
      const res = mockRes();

      await authController.login(req, res, mockNext);

      expect(setRefreshTokenCookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards service errors to next()', async () => {
      const err = new Error('unauthorized');
      (authService.login as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body });
      const res = mockRes();

      await authController.login(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('verifyMfaLogin', () => {
    it('happy path — sets cookie and returns 200', async () => {
      (authService.verifyMfaLogin as jest.Mock).mockResolvedValue(TOKENS);
      const req = mockReq({ body: { tempToken: 'temp-token', token: '123456' } });
      const res = mockRes();

      await authController.verifyMfaLogin(req, res, mockNext);

      expect(authService.verifyMfaLogin).toHaveBeenCalledWith('temp-token', '123456');
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, TOKENS.refreshToken);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('invalid mfa');
      (authService.verifyMfaLogin as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body: { tempToken: 'valid-temp-token', token: '123456' } });
      const res = mockRes();

      await authController.verifyMfaLogin(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('logout', () => {
    it('calls authService.logout, clears cookie, returns 200', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq();
      const res = mockRes();

      await authController.logout(req, res, mockNext);

      expect(authService.logout).toHaveBeenCalledWith('user-uuid');
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });


  describe('refreshToken', () => {
    it('happy path — reads cookie, rotates token, returns new accessToken', async () => {
      const newTokens = { accessToken: 'new-acc', refreshToken: 'new-ref' };
      (authService.refreshToken as jest.Mock).mockResolvedValue(newTokens);
      const req = mockReq({ cookies: { refreshToken: 'old-ref-token' } });
      const res = mockRes();

      await authController.refreshToken(req, res, mockNext);

      expect(authService.refreshToken).toHaveBeenCalledWith('old-ref-token');
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, 'new-ref');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('throws UnauthorizedError when no cookie is present', async () => {
      const req = mockReq({ cookies: {} });
      const res = mockRes();

      await authController.refreshToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });


  describe('changePassword', () => {
    it('happy path — changes password, clears cookie, returns 200', async () => {
      (authService.changePassword as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({
        body: { currentPassword: 'OldPass1!', newPassword: 'NewPass1@', confirmNewPassword: 'NewPass1@' },
      });
      const res = mockRes();

      await authController.changePassword(req, res, mockNext);

      expect(authService.changePassword).toHaveBeenCalledWith(
        'user-uuid',
        'OldPass1!',
        'NewPass1@'
      );
      expect(clearRefreshTokenCookie).toHaveBeenCalledWith(res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards service errors to next()', async () => {
      const err = new Error('wrong password');
      (authService.changePassword as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body: { currentPassword: 'OldPass1!', newPassword: 'NewPass1@', confirmNewPassword: 'NewPass1@' } });
      const res = mockRes();

      await authController.changePassword(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getProfile', () => {
    it('returns user profile with 200', async () => {
      (authService.getUserById as jest.Mock).mockResolvedValue(SAFE_USER);
      const req = mockReq();
      const res = mockRes();

      await authController.getProfile(req, res, mockNext);

      expect(authService.getUserById).toHaveBeenCalledWith('user-uuid');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards NotFoundError to next()', async () => {
      const err = new Error('not found');
      (authService.getUserById as jest.Mock).mockRejectedValue(err);
      const req = mockReq();
      const res = mockRes();

      await authController.getProfile(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('setupMfa', () => {
    it('returns QR code URL and plain secret with 200', async () => {
      const mfaData = { qrCodeUrl: 'data:image/png;...', secret: 'TOTP_SECRET' };
      (authService.setupMfa as jest.Mock).mockResolvedValue(mfaData);
      const req = mockReq();
      const res = mockRes();

      await authController.setupMfa(req, res, mockNext);

      expect(authService.setupMfa).toHaveBeenCalledWith('user-uuid');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });


  describe('verifySetupMfa', () => {
    it('verifies MFA setup token and returns 200', async () => {
      (authService.verifySetupMfa as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ body: { token: '123456' } });
      const res = mockRes();

      await authController.verifySetupMfa(req, res, mockNext);

      expect(authService.verifySetupMfa).toHaveBeenCalledWith('user-uuid', '123456');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards invalid token error to next()', async () => {
      const err = new Error('invalid token');
      (authService.verifySetupMfa as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body: { token: '000000' } });
      const res = mockRes();

      await authController.verifySetupMfa(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('forgotPassword', () => {
    it('always returns 200 (no email enumeration)', async () => {
      (authService.forgotPassword as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ body: { email: 'anyone@example.com' } });
      const res = mockRes();

      await authController.forgotPassword(req, res, mockNext);

      expect(authService.forgotPassword).toHaveBeenCalledWith('anyone@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });


  describe('resetPassword', () => {
    it('happy path — resets password and returns 200', async () => {
      (authService.resetPassword as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ body: { token: 'reset-token', newPassword: 'NewPass1@', confirmNewPassword: 'NewPass1@' } });
      const res = mockRes();

      await authController.resetPassword(req, res, mockNext);

      expect(authService.resetPassword).toHaveBeenCalledWith('reset-token', 'NewPass1@');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards invalid/expired token error to next()', async () => {
      const err = new Error('expired token');
      (authService.resetPassword as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body: { token: 'reset-token', newPassword: 'NewPass1@', confirmNewPassword: 'NewPass1@' } });
      const res = mockRes();

      await authController.resetPassword(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('verifyEmail', () => {
    it('verifies email and returns 200', async () => {
      (authService.verifyEmail as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ body: { token: 'verify-token' } });
      const res = mockRes();

      await authController.verifyEmail(req, res, mockNext);

      expect(authService.verifyEmail).toHaveBeenCalledWith('verify-token');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards invalid/expired token error to next()', async () => {
      const err = new Error('expired');
      (authService.verifyEmail as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body: { token: 'bad-token' } });
      const res = mockRes();

      await authController.verifyEmail(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('resendVerification', () => {
    it('always returns 200 (no email enumeration)', async () => {
      (authService.resendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ body: { email: 'anyone@example.com' } });
      const res = mockRes();

      await authController.resendVerification(req, res, mockNext);

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith('anyone@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
