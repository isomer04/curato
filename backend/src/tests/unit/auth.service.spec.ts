// ─── Mocks must be hoisted before any imports ─────────────────────────────────

jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateWithoutHooks: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../../repositories/patient.repository', () => ({
  patientRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../repositories/doctor.repository', () => ({
  doctorRepository: {
    findByLicenseNumber: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

// Barrel re-exports — mirror individual mocks so services importing from the
// barrel ('repositories') receive the same mock instances.
jest.mock('../../repositories', () => ({
  userRepository: require('../../repositories/user.repository').userRepository,
  patientRepository: require('../../repositories/patient.repository').patientRepository,
  doctorRepository: require('../../repositories/doctor.repository').doctorRepository,
}));

jest.mock('../../models', () => ({
  User: {},
  PatientAllergy: { bulkCreate: jest.fn().mockResolvedValue([]) },
  DoctorLanguage: { bulkCreate: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn().mockImplementation(cb => cb({})),
  },
}));

jest.mock('../../utils/jwt.util', () => ({
  generateTokenPair: jest.fn(),
  verifyRefreshToken: jest.fn(),
  generateMfaToken: jest.fn(),
  verifyMfaToken: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../utils/password.util', () => ({
  isCommonPassword: jest.fn().mockReturnValue(false),
  hashPassword: jest.fn().mockResolvedValue('$hashed$'),
  comparePassword: jest.fn(),
}));

jest.mock('../../utils/crypto.util', () => ({
  encrypt: jest.fn().mockReturnValue('encrypted-secret'),
  decrypt: jest.fn().mockReturnValue('TOTP_SECRET'),
  isEncrypted: jest.fn().mockReturnValue(true),
}));

jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('TOTP_SECRET'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/test'),
  verifySync: jest.fn().mockReturnValue({ valid: true, delta: 0 }),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrcode'),
}));

jest.mock('../../services/email.service', () => ({
  emailService: {
    sendEmailVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  },
}));


import { authService } from '../../services/auth.service';
import { userRepository } from '../../repositories/user.repository';
import { patientRepository } from '../../repositories/patient.repository';
import { doctorRepository } from '../../repositories/doctor.repository';
import { PatientAllergy } from '../../models';
import { generateTokenPair, verifyRefreshToken, verifyMfaToken } from '../../utils/jwt.util';
import { isCommonPassword } from '../../utils/password.util';
import { UserRole, Gender } from '../../types/constants';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors';
import { hashToken } from '../../services/auth.types';


const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-uuid',
  email: 'test@example.com',
  role: UserRole.PATIENT,
  loginAttempts: 0,
  isActive: true,
  isEmailVerified: true,
  mfaEnabled: false,
  mfaSecret: null,
  mfaTempTokenHash: null,
  refreshToken: null,
  lockoutUntil: null,
  update: jest.fn().mockResolvedValue(undefined),
  toSafeObject: jest.fn().mockReturnValue({ id: 'user-uuid', email: 'test@example.com' }),
  comparePassword: jest.fn().mockResolvedValue(true),
  isLocked: jest.fn().mockReturnValue(false),
  ...overrides,
});

const TOKENS = { accessToken: 'acc-token', refreshToken: 'ref-token' };

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateTokenPair as jest.Mock).mockReturnValue(TOKENS);
  });


  describe('register', () => {
    const payload = {
      email: 'new@example.com',
      password: 'StrongPass1!',
      firstName: 'Alice',
      lastName: 'Smith',
      role: UserRole.PATIENT,
    };

    it('register — happy path — returns user and tokens', async () => {
      const mockUser = makeUser({ email: payload.email });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register(payload);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(payload.email);
      expect(result.accessToken).toBe(TOKENS.accessToken);
      expect(result.refreshToken).toBe(TOKENS.refreshToken);
      expect(result.user).toBeDefined();
    });

    it('register — email already registered — throws ConflictError', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());
      await expect(authService.register(payload)).rejects.toThrow(ConflictError);
    });

    it('register — common password — throws BadRequestError', async () => {
      (isCommonPassword as jest.Mock).mockReturnValueOnce(true);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      await expect(authService.register(payload)).rejects.toThrow(BadRequestError);
    });

    it('register — no role in payload — defaults to PATIENT role', async () => {
      const mockUser = makeUser();
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
      const { role: _r, ...noRole } = payload;
      await authService.register(noRole);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.PATIENT }),
        expect.anything()
      );
    });
  });


  describe('registerPatient', () => {
    const payload = {
      email: 'patient@example.com',
      password: 'StrongPass1!',
      firstName: 'Bob',
      lastName: 'Brown',
      dateOfBirth: '1990-01-15',
      gender: Gender.MALE,
    };

    it('happy path — creates user AND patient profile', async () => {
      const mockUser = makeUser({ role: UserRole.PATIENT });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
      (patientRepository.create as jest.Mock).mockResolvedValue({});

      const result = await authService.registerPatient(payload);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.PATIENT }),
        expect.anything()
      );
      expect(patientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-uuid', gender: Gender.MALE }),
        expect.anything()
      );
      expect(result.accessToken).toBe(TOKENS.accessToken);
    });

    it('throws ConflictError when email already registered', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());
      await expect(authService.registerPatient(payload)).rejects.toThrow(ConflictError);
    });

    it('throws BadRequestError for common password', async () => {
      (isCommonPassword as jest.Mock).mockReturnValueOnce(true);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      await expect(authService.registerPatient(payload)).rejects.toThrow(BadRequestError);
    });

    it('forwards optional patient fields (bloodGroup, allergies, emergency contact)', async () => {
      const mockUser = makeUser({ role: UserRole.PATIENT });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
      (patientRepository.create as jest.Mock).mockResolvedValue({ id: 'patient-uuid' });

      await authService.registerPatient({
        ...payload,
        bloodGroup: 'O+',
        allergies: ['pollen'],
        emergencyContactName: 'Dad',
        emergencyContactPhone: '555-0100',
      });

      expect(patientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bloodGroup: 'O+',
          emergencyContactName: 'Dad',
          emergencyContactPhone: '555-0100',
        }),
        expect.anything()
      );
      expect(PatientAllergy.bulkCreate).toHaveBeenCalledWith(
        [{ patientId: 'patient-uuid', allergyName: 'pollen' }],
        expect.objectContaining({ transaction: expect.anything() })
      );
    });
  });


  describe('registerDoctor', () => {
    const payload = {
      email: 'doc@example.com',
      password: 'StrongPass1!',
      firstName: 'Dr',
      lastName: 'Who',
      specialization: 'Cardiology',
      licenseNumber: 'LIC-001',
    };

    it('happy path — creates user AND doctor profile', async () => {
      const mockUser = makeUser({ role: UserRole.DOCTOR });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (doctorRepository.findByLicenseNumber as jest.Mock).mockResolvedValue(null);
      (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
      (doctorRepository.create as jest.Mock).mockResolvedValue({});

      const result = await authService.registerDoctor(payload);

      expect(doctorRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ licenseNumber: 'LIC-001' }),
        expect.anything()
      );
      expect(result.accessToken).toBe(TOKENS.accessToken);
    });

    it('throws ConflictError when email already registered', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser());
      await expect(authService.registerDoctor(payload)).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError when license number already exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (doctorRepository.findByLicenseNumber as jest.Mock).mockResolvedValue({ id: 'doc-1' });
      await expect(authService.registerDoctor(payload)).rejects.toThrow(ConflictError);
    });

    it('throws BadRequestError for common password', async () => {
      (isCommonPassword as jest.Mock).mockReturnValueOnce(true);
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      (doctorRepository.findByLicenseNumber as jest.Mock).mockResolvedValue(null);
      await expect(authService.registerDoctor(payload)).rejects.toThrow(BadRequestError);
    });
  });


  describe('login', () => {
    const credentials = { email: 'test@example.com', password: 'StrongPass1!' };

    it('happy path — returns user + tokens', async () => {
      const mockUser = makeUser();
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.login(credentials);

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe(TOKENS.accessToken);
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ loginAttempts: 0 })
      );
    });

    it('throws UnauthorizedError for unknown email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when account is locked', async () => {
      const locked = makeUser({
        isLocked: jest.fn().mockReturnValue(true),
        lockoutUntil: new Date(Date.now() + 600_000),
      });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(locked);
      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when account is deactivated', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(makeUser({ isActive: false }));
      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);
    });

    it('increments loginAttempts on wrong password', async () => {
      const mockUser = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ loginAttempts: 1 })
      );
    });

    it('locks account after reaching MAX_LOGIN_ATTEMPTS (5)', async () => {
      const mockUser = makeUser({
        loginAttempts: 4,
        comparePassword: jest.fn().mockResolvedValue(false),
      });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(credentials)).rejects.toThrow(UnauthorizedError);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ lockoutUntil: expect.any(Date) })
      );
    });

    it('returns mfaRequired=true when MFA is enabled', async () => {
      const mfaUser = makeUser({ mfaEnabled: true });
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mfaUser);
      const { generateMfaToken } = require('../../utils/jwt.util');
      (generateMfaToken as jest.Mock).mockReturnValue('mfa-temp');

      const result = await authService.login(credentials);

      expect(result.mfaRequired).toBe(true);
      expect(result.tempToken).toBe('mfa-temp');
      expect(result.accessToken).toBeUndefined();
    });
  });


  describe('refreshToken', () => {
    it('happy path — returns new token pair', async () => {
      const incoming = 'valid-refresh-token';
      const mockUser = makeUser({ refreshToken: hashToken(incoming), isActive: true });
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (generateTokenPair as jest.Mock).mockReturnValue({
        accessToken: 'new-acc',
        refreshToken: 'new-ref',
      });

      const result = await authService.refreshToken(incoming);

      expect(result.accessToken).toBe('new-acc');
    });

    it('throws UnauthorizedError when user not found', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.refreshToken('token')).rejects.toThrow(UnauthorizedError);
    });

    it('invalidates token and throws on hash mismatch (token theft)', async () => {
      const mockUser = makeUser({ refreshToken: hashToken('legit-token') });
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.refreshToken('stolen-token')).rejects.toThrow(UnauthorizedError);
      expect(userRepository.update).toHaveBeenCalledWith(mockUser, { refreshToken: null });
    });

    it('throws UnauthorizedError when account is deactivated', async () => {
      const incoming = 'valid-token';
      const mockUser = makeUser({ refreshToken: hashToken(incoming), isActive: false });
      (verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.refreshToken(incoming)).rejects.toThrow(UnauthorizedError);
    });

    it('wraps generic JWT errors in UnauthorizedError', async () => {
      (verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      await expect(authService.refreshToken('bad')).rejects.toThrow(UnauthorizedError);
    });

    it('rethrows existing UnauthorizedError from verifyRefreshToken', async () => {
      (verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedError('denied');
      });
      await expect(authService.refreshToken('bad')).rejects.toThrow(UnauthorizedError);
    });
  });


  describe('logout', () => {
    it('clears the stored refresh token', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await authService.logout('user-uuid');

      expect(userRepository.update).toHaveBeenCalledWith(mockUser, { refreshToken: null });
    });

    it('is a no-op when user does not exist', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.logout('ghost')).resolves.toBeUndefined();
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });


  describe('changePassword', () => {
    it('happy path — updates hashed password and clears refresh token', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await authService.changePassword('user-uuid', 'OldPass1!', 'NewPass2!');

      expect(userRepository.updateWithoutHooks).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ refreshToken: null })
      );
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.changePassword('x', 'a', 'b')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when current password is wrong', async () => {
      const mockUser = makeUser({ comparePassword: jest.fn().mockResolvedValue(false) });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      await expect(authService.changePassword('x', 'wrong', 'new')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws BadRequestError when new password is too common', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (isCommonPassword as jest.Mock).mockReturnValueOnce(true);
      await expect(authService.changePassword('x', 'OldPass1!', 'password')).rejects.toThrow(
        BadRequestError
      );
    });
  });


  describe('getUserById', () => {
    it('returns user when found', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      const result = await authService.getUserById('user-uuid');
      expect(result).toBe(mockUser);
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.getUserById('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('setupMfa', () => {
    it('happy path — returns qrCodeUrl and plaintext secret', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.setupMfa('user-uuid');

      expect(result.qrCodeUrl).toContain('data:image/png');
      expect(result.secret).toBe('TOTP_SECRET');
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ mfaSecret: 'encrypted-secret' })
      );
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.setupMfa('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('verifySetupMfa', () => {
    it('enables MFA on valid token', async () => {
      const mockUser = makeUser({ mfaSecret: 'encrypted-secret' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await authService.verifySetupMfa('user-uuid', '123456');

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ mfaEnabled: true })
      );
    });

    it('throws BadRequestError when mfaSecret is not set (setup not started)', async () => {
      const mockUser = makeUser({ mfaSecret: null });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      await expect(authService.verifySetupMfa('user-uuid', '000000')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws UnauthorizedError for invalid TOTP token', async () => {
      const { verifySync } = require('otplib');
      (verifySync as jest.Mock).mockReturnValueOnce({ valid: false, delta: 0 });
      const mockUser = makeUser({ mfaSecret: 'encrypted-secret' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.verifySetupMfa('user-uuid', '000000')).rejects.toThrow(
        UnauthorizedError
      );
    });
  });


  describe('verifyMfaLogin', () => {
    it('happy path — validates TOTP and returns full auth response', async () => {
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      const mockUser = makeUser({
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaTempTokenHash: hashToken('temp-token'),
      });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.verifyMfaLogin('temp-token', '123456');

      expect(result.accessToken).toBe(TOKENS.accessToken);
      expect(result.user).toBeDefined();
    });

    it('throws UnauthorizedError for invalid/expired tempToken', async () => {
      (verifyMfaToken as jest.Mock).mockImplementation(() => {
        throw new Error('expired');
      });
      await expect(authService.verifyMfaLogin('bad-token', '123456')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('throws UnauthorizedError when user not found', async () => {
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(authService.verifyMfaLogin('temp', '123456')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when MFA is not enabled for user', async () => {
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      const mockUser = makeUser({ mfaEnabled: false, mfaSecret: null });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      await expect(authService.verifyMfaLogin('temp', '123456')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for invalid TOTP code', async () => {
      const { verifySync } = require('otplib');
      (verifySync as jest.Mock).mockReturnValueOnce({ valid: false, delta: 0 });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      const mockUser = makeUser({ mfaEnabled: true, mfaSecret: 'encrypted-secret' });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.verifyMfaLogin('temp', '000000')).rejects.toThrow(UnauthorizedError);
    });
  });
});
