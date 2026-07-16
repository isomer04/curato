
jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    updateWithoutHooks: jest.fn().mockResolvedValue(undefined),
    findByPasswordResetTokenHash: jest.fn(),
    findByEmailVerificationTokenHash: jest.fn(),
  },
}));

jest.mock('../../repositories/doctor.repository', () => ({
  doctorRepository: {
    findByUserId: jest.fn(),
  },
}));

jest.mock('../../repositories', () => ({
  userRepository: require('../../repositories/user.repository').userRepository,
  doctorRepository: require('../../repositories/doctor.repository').doctorRepository,
}));

jest.mock('../../utils/jwt.util', () => ({
  generateTokenPair: jest.fn(),
  generateMfaToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../utils/password.util', () => ({
  isCommonPassword: jest.fn().mockReturnValue(false),
  hashPassword: jest.fn().mockResolvedValue('$hashed-new$'),
  comparePassword: jest.fn(),
}));

jest.mock('../../services/email.service', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
  },
}));


import { sessionService } from '../../services/session.service';
import { userRepository } from '../../repositories/user.repository';
import { doctorRepository } from '../../repositories/doctor.repository';
import { generateTokenPair, generateMfaToken, verifyRefreshToken } from '../../utils/jwt.util';
import { isCommonPassword } from '../../utils/password.util';
import { emailService } from '../../services/email.service';
import { UserRole } from '../../types/constants';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../shared/errors';
import { hashToken } from '../../services/auth.types';


const TOKENS = { accessToken: 'acc-token', refreshToken: 'ref-token' };

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-uuid',
  email: 'test@example.com',
  firstName: 'Test',
  role: UserRole.PATIENT,
  loginAttempts: 0,
  isActive: true,
  isEmailVerified: true,
  mfaEnabled: false,
  mfaSecret: null,
  mfaTempTokenHash: null,
  refreshToken: null,
  lockoutUntil: null,
  passwordResetTokenHash: null,
  passwordResetExpiresAt: null,
  emailVerificationTokenHash: null,
  emailVerificationExpiresAt: null,
  update: jest.fn().mockResolvedValue(undefined),
  toSafeObject: jest.fn().mockReturnValue({ id: 'user-uuid', email: 'test@example.com' }),
  comparePassword: jest.fn().mockResolvedValue(true),
  isLocked: jest.fn().mockReturnValue(false),
  ...overrides,
});


describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateTokenPair as jest.Mock).mockReturnValue(TOKENS);
    (generateMfaToken as jest.Mock).mockReturnValue('mfa-temp-token');
  });


  describe('login', () => {
    it('happy path — returns user + tokens', async () => {
      const user = makeUser();
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      const result = await sessionService.login({
        email: 'test@example.com',
        password: 'StrongPass1!',
      });

      expect(result.accessToken).toBe(TOKENS.accessToken);
      expect(result.refreshToken).toBe(TOKENS.refreshToken);
      expect(result.user).toBeDefined();
    });

    it('resets loginAttempts to 0 on successful login', async () => {
      const user = makeUser({ loginAttempts: 3 });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await sessionService.login({ email: 'test@example.com', password: 'pass' });

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ loginAttempts: 0 })
      );
    });

    it('throws UnauthorizedError for unknown email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        sessionService.login({ email: 'unknown@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when account is locked (no lockoutUntil)', async () => {
      const user = makeUser({ isLocked: jest.fn().mockReturnValue(true), lockoutUntil: null });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError with countdown when lockoutUntil is set', async () => {
      const lockoutUntil = new Date(Date.now() + 5 * 60000);
      const user = makeUser({
        isLocked: jest.fn().mockReturnValue(true),
        lockoutUntil,
      });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when account is deactivated', async () => {
      const user = makeUser({ isActive: false });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when email is not verified', async () => {
      const user = makeUser({ isEmailVerified: false });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for unapproved doctor', async () => {
      const user = makeUser({ role: UserRole.DOCTOR });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue({ isApproved: false });

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('allows approved doctor to log in', async () => {
      const user = makeUser({ role: UserRole.DOCTOR });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue({ isApproved: true });

      const result = await sessionService.login({ email: 'test@example.com', password: 'pass' });

      expect(result.accessToken).toBe(TOKENS.accessToken);
    });

    it('allows doctor to log in when no doctor profile exists yet', async () => {
      const user = makeUser({ role: UserRole.DOCTOR });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);
      (doctorRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      const result = await sessionService.login({ email: 'test@example.com', password: 'pass' });

      expect(result.accessToken).toBe(TOKENS.accessToken);
    });

    it('increments loginAttempts on wrong password', async () => {
      const user = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow(UnauthorizedError);

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ loginAttempts: 1 })
      );
    });

    it('locks account after reaching MAX_LOGIN_ATTEMPTS (5)', async () => {
      const user = makeUser({
        loginAttempts: 4,
        comparePassword: jest.fn().mockResolvedValue(false),
      });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toThrow(UnauthorizedError);

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ lockoutUntil: expect.any(Date) })
      );
    });

    it('returns mfaRequired=true when MFA is enabled', async () => {
      const user = makeUser({ mfaEnabled: true });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      const result = await sessionService.login({ email: 'test@example.com', password: 'pass' });

      expect(result.mfaRequired).toBe(true);
      expect(result.tempToken).toBe('mfa-temp-token');
    });

    it('stores hashed tempToken when MFA is enabled', async () => {
      const user = makeUser({ mfaEnabled: true });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await sessionService.login({ email: 'test@example.com', password: 'pass' });

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ mfaTempTokenHash: expect.any(String) })
      );
    });
  });


  describe('refreshToken', () => {
    it('happy path — returns new token pair', async () => {
      const rawToken = 'raw-refresh-token';
      const user = makeUser({ refreshToken: hashToken(rawToken) });
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      const result = await sessionService.refreshToken(rawToken);

      expect(result.accessToken).toBe(TOKENS.accessToken);
      expect(result.refreshToken).toBe(TOKENS.refreshToken);
    });

    it('throws UnauthorizedError when user not found', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.refreshToken('some-token')).rejects.toThrow(UnauthorizedError);
    });

    it('throws and clears refresh token on hash mismatch (token theft)', async () => {
      const user = makeUser({ refreshToken: hashToken('correct-token') });
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.refreshToken('wrong-token')).rejects.toThrow(UnauthorizedError);
      expect(userRepository.update).toHaveBeenCalledWith(user, { refreshToken: null });
    });

    it('throws UnauthorizedError when account is deactivated', async () => {
      const rawToken = 'raw-refresh-token';
      const user = makeUser({ refreshToken: hashToken(rawToken), isActive: false });
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.refreshToken(rawToken)).rejects.toThrow(UnauthorizedError);
    });

    it('wraps generic JWT errors in UnauthorizedError', async () => {
      (verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(sessionService.refreshToken('bad-token')).rejects.toThrow(UnauthorizedError);
    });

    it('rethrows existing UnauthorizedError from verifyRefreshToken', async () => {
      (verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('Token expired');
      });

      await expect(sessionService.refreshToken('expired-token')).rejects.toThrow(UnauthorizedError);
    });
  });


  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      const user = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await sessionService.logout('user-uuid');

      expect(userRepository.update).toHaveBeenCalledWith(user, { refreshToken: null });
    });

    it('is a no-op when user does not exist', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.logout('unknown-uuid')).resolves.toBeUndefined();
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });


  describe('changePassword', () => {
    it('happy path — updates hashed password and clears refresh token', async () => {
      const user = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await sessionService.changePassword('user-uuid', 'OldPass1!', 'NewPass1!');

      expect(userRepository.updateWithoutHooks).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ password: '$hashed-new$', refreshToken: null })
      );
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.changePassword('unknown', 'old', 'new')).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws BadRequestError when current password is wrong', async () => {
      const user = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.changePassword('user-uuid', 'wrong', 'NewPass1!')
      ).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError when new password is too common', async () => {
      const user = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(user);
      (isCommonPassword as jest.Mock).mockReturnValueOnce(true);

      await expect(
        sessionService.changePassword('user-uuid', 'OldPass1!', 'password123')
      ).rejects.toThrow(BadRequestError);
    });
  });


  describe('getUserById', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      const result = await sessionService.getUserById('user-uuid');

      expect(result).toBe(user);
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.getUserById('unknown')).rejects.toThrow(NotFoundError);
    });
  });


  describe('forgotPassword', () => {
    it('saves reset token and sends email when user exists and is active', async () => {
      const user = makeUser();
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await sessionService.forgotPassword('test@example.com');

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({
          passwordResetTokenHash: expect.any(String),
          passwordResetExpiresAt: expect.any(Date),
        })
      );
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        user.firstName,
        expect.any(String)
      );
    });

    it('silently succeeds for unknown email (no enumeration)', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.forgotPassword('unknown@example.com')).resolves.toBeUndefined();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('silently succeeds for inactive account (no enumeration)', async () => {
      const user = makeUser({ isActive: false });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.forgotPassword('test@example.com')).resolves.toBeUndefined();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('reset token expiry is set to 1 hour in the future', async () => {
      const before = Date.now();
      const user = makeUser();
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await sessionService.forgotPassword('test@example.com');

      const call = (userRepository.update as jest.Mock).mock.calls[0][1];
      const expiry: Date = call.passwordResetExpiresAt;
      expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 100);
      expect(expiry.getTime()).toBeLessThanOrEqual(before + 60 * 60 * 1000 + 5000);
    });
  });


  describe('resetPassword', () => {
    it('happy path — resets password and clears all reset/session state', async () => {
      const user = makeUser({ passwordResetExpiresAt: new Date(Date.now() + 60000) });
      (userRepository.findByPasswordResetTokenHash as jest.Mock).mockResolvedValue(user);

      await sessionService.resetPassword('valid-token', 'NewPass1!');

      expect(userRepository.updateWithoutHooks).toHaveBeenCalledWith(
        user,
        expect.objectContaining({
          password: '$hashed-new$',
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          refreshToken: null,
        })
      );
    });

    it('throws BadRequestError for invalid/unknown token', async () => {
      (userRepository.findByPasswordResetTokenHash as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.resetPassword('bad-token', 'NewPass1!')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws BadRequestError for expired token', async () => {
      const user = makeUser({ passwordResetExpiresAt: new Date(Date.now() - 1000) });
      (userRepository.findByPasswordResetTokenHash as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.resetPassword('expired-token', 'NewPass1!')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws BadRequestError when new password is too common', async () => {
      const user = makeUser({ passwordResetExpiresAt: new Date(Date.now() + 60000) });
      (userRepository.findByPasswordResetTokenHash as jest.Mock).mockResolvedValue(user);
      (isCommonPassword as jest.Mock).mockReturnValueOnce(true);

      await expect(sessionService.resetPassword('valid-token', 'password')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws BadRequestError when passwordResetExpiresAt is null', async () => {
      const user = makeUser({ passwordResetExpiresAt: null });
      (userRepository.findByPasswordResetTokenHash as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.resetPassword('valid-token', 'NewPass1!')).rejects.toThrow(
        BadRequestError
      );
    });
  });


  describe('verifyEmail', () => {
    it('happy path — marks email as verified and clears token', async () => {
      const user = makeUser({
        isEmailVerified: false,
        emailVerificationExpiresAt: new Date(Date.now() + 60000),
      });
      (userRepository.findByEmailVerificationTokenHash as jest.Mock).mockResolvedValue(user);

      await sessionService.verifyEmail('valid-token');

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ isEmailVerified: true })
      );
    });

    it('throws BadRequestError for invalid/unknown token', async () => {
      (userRepository.findByEmailVerificationTokenHash as jest.Mock).mockResolvedValue(null);

      await expect(sessionService.verifyEmail('bad-token')).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError for expired token', async () => {
      const user = makeUser({
        isEmailVerified: false,
        emailVerificationExpiresAt: new Date(Date.now() - 1000),
      });
      (userRepository.findByEmailVerificationTokenHash as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.verifyEmail('expired-token')).rejects.toThrow(BadRequestError);
    });

    it('is idempotent — clears token even when already verified', async () => {
      const user = makeUser({
        isEmailVerified: true,
        emailVerificationExpiresAt: new Date(Date.now() + 60000),
      });
      (userRepository.findByEmailVerificationTokenHash as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.verifyEmail('valid-token')).resolves.toBeUndefined();

      expect(userRepository.update).toHaveBeenCalledWith(user, {
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      });
    });

    it('throws BadRequestError when emailVerificationExpiresAt is null', async () => {
      const user = makeUser({
        isEmailVerified: false,
        emailVerificationExpiresAt: null,
      });
      (userRepository.findByEmailVerificationTokenHash as jest.Mock).mockResolvedValue(user);

      await expect(sessionService.verifyEmail('valid-token')).rejects.toThrow(BadRequestError);
    });
  });


  describe('resendVerificationEmail', () => {
    it('saves new token and queues email when user is unverified', async () => {
      const user = makeUser({ isEmailVerified: false });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await sessionService.resendVerificationEmail('test@example.com');

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({
          emailVerificationTokenHash: expect.any(String),
          emailVerificationExpiresAt: expect.any(Date),
        })
      );
      expect(emailService.sendEmailVerificationEmail).toHaveBeenCalledWith(
        user.email,
        user.firstName,
        expect.any(String)
      );
    });

    it('silently succeeds for unknown email (no enumeration)', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        sessionService.resendVerificationEmail('unknown@example.com')
      ).resolves.toBeUndefined();
      expect(emailService.sendEmailVerificationEmail).not.toHaveBeenCalled();
    });

    it('silently succeeds when already verified', async () => {
      const user = makeUser({ isEmailVerified: true });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.resendVerificationEmail('test@example.com')
      ).resolves.toBeUndefined();
      expect(emailService.sendEmailVerificationEmail).not.toHaveBeenCalled();
    });

    it('silently succeeds when account is inactive', async () => {
      const user = makeUser({ isActive: false, isEmailVerified: false });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(user);

      await expect(
        sessionService.resendVerificationEmail('test@example.com')
      ).resolves.toBeUndefined();
      expect(emailService.sendEmailVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
