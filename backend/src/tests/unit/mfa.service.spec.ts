
jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findById: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../repositories', () => ({
  userRepository: require('../../repositories/user.repository').userRepository,
}));

jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('TOTP_SECRET'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/HealthcareApp:test%40example.com'),
  verifySync: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrcode'),
}));

jest.mock('../../utils/jwt.util', () => ({
  verifyMfaToken: jest.fn(),
  generateTokenPair: jest.fn(),
}));

jest.mock('../../utils/crypto.util', () => ({
  encrypt: jest.fn().mockReturnValue('v1:encrypted-secret'),
  decrypt: jest.fn().mockReturnValue('TOTP_SECRET'),
  isEncrypted: jest.fn().mockReturnValue(true),
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));


import { mfaService } from '../../services/mfa.service';
import { userRepository } from '../../repositories/user.repository';
import { verifyMfaToken, generateTokenPair } from '../../utils/jwt.util';
import { verifySync } from 'otplib';
import { UserRole } from '../../types/constants';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../shared/errors';
import { hashToken } from '../../services/auth.types';


const TOKENS = { accessToken: 'acc-token', refreshToken: 'ref-token' };

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-uuid',
  email: 'test@example.com',
  firstName: 'Test',
  role: UserRole.PATIENT,
  mfaEnabled: false,
  mfaSecret: null,
  mfaTempTokenHash: null,
  update: jest.fn().mockResolvedValue(undefined),
  toSafeObject: jest.fn().mockReturnValue({ id: 'user-uuid', email: 'test@example.com' }),
  ...overrides,
});


describe('MfaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateTokenPair as jest.Mock).mockReturnValue(TOKENS);
    (verifySync as jest.Mock).mockReturnValue({ valid: true, delta: 0 });
  });


  describe('setupMfa', () => {
    it('happy path — generates QR code URL and returns plain-text secret', async () => {
      const user = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      const result = await mfaService.setupMfa('user-uuid');

      expect(result.qrCodeUrl).toBe('data:image/png;base64,qrcode');
      expect(result.secret).toBe('TOTP_SECRET');
    });

    it('stores the encrypted secret in the user record', async () => {
      const user = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await mfaService.setupMfa('user-uuid');

      expect(userRepository.update).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ mfaSecret: 'v1:encrypted-secret' })
      );
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(mfaService.setupMfa('unknown-uuid')).rejects.toThrow(NotFoundError);
    });

    it('uses user email as the TOTP label', async () => {
      const { generateURI } = jest.requireMock('otplib');
      const user = makeUser({ email: 'alice@example.com' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await mfaService.setupMfa('user-uuid');

      expect(generateURI).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'alice@example.com' })
      );
    });
  });


  describe('verifySetupMfa', () => {
    it('enables MFA on valid token', async () => {
      const user = makeUser({ mfaSecret: 'v1:encrypted-secret' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await mfaService.verifySetupMfa('user-uuid', '123456');

      expect(userRepository.update).toHaveBeenCalledWith(user, { mfaEnabled: true });
    });

    it('throws BadRequestError when mfaSecret is not set (setup not started)', async () => {
      const user = makeUser({ mfaSecret: null });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(mfaService.verifySetupMfa('user-uuid', '123456')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws BadRequestError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(mfaService.verifySetupMfa('unknown-uuid', '123456')).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws UnauthorizedError for invalid TOTP token', async () => {
      (verifySync as jest.Mock).mockReturnValue({ valid: false, delta: null });
      const user = makeUser({ mfaSecret: 'v1:encrypted-secret' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(mfaService.verifySetupMfa('user-uuid', '000000')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('decrypts an already-encrypted secret before verifying', async () => {
      const { decrypt, isEncrypted } = jest.requireMock('../../utils/crypto.util');
      isEncrypted.mockReturnValue(true);

      const user = makeUser({ mfaSecret: 'v1:encrypted-secret' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await mfaService.verifySetupMfa('user-uuid', '123456');

      expect(decrypt).toHaveBeenCalledWith('v1:encrypted-secret');
    });

    it('uses secret as-is when not encrypted', async () => {
      const { decrypt, isEncrypted } = jest.requireMock('../../utils/crypto.util');
      isEncrypted.mockReturnValue(false);

      const user = makeUser({ mfaSecret: 'PLAIN_SECRET' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await mfaService.verifySetupMfa('user-uuid', '123456');

      expect(decrypt).not.toHaveBeenCalled();
      expect(verifySync).toHaveBeenCalledWith(expect.objectContaining({ secret: 'PLAIN_SECRET' }));
    });
  });


  describe('verifyMfaLogin', () => {
    it('happy path — validates TOTP and returns full auth response', async () => {
      const tempToken = 'mfa-temp-token';
      const user = makeUser({
        mfaEnabled: true,
        mfaSecret: 'v1:encrypted-secret',
        mfaTempTokenHash: hashToken(tempToken),
      });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      const result = await mfaService.verifyMfaLogin(tempToken, '123456');

      expect(result.accessToken).toBe(TOKENS.accessToken);
      expect(result.refreshToken).toBe(TOKENS.refreshToken);
      expect(result.user).toBeDefined();
    });

    it('invalidates tempToken after successful login (single-use)', async () => {
      const tempToken = 'mfa-temp-token';
      const user = makeUser({
        mfaEnabled: true,
        mfaSecret: 'v1:encrypted-secret',
        mfaTempTokenHash: hashToken(tempToken),
      });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await mfaService.verifyMfaLogin(tempToken, '123456');

      // First call clears tempToken, second stores refreshToken hash
      expect(userRepository.update).toHaveBeenCalledWith(user, { mfaTempTokenHash: null });
    });

    it('throws UnauthorizedError for invalid/expired tempToken', async () => {
      (verifyMfaToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(mfaService.verifyMfaLogin('expired-token', '123456')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('throws UnauthorizedError when user not found', async () => {
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(mfaService.verifyMfaLogin('temp-token', '123456')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('throws UnauthorizedError when MFA is not enabled for user', async () => {
      const tempToken = 'mfa-temp-token';
      const user = makeUser({ mfaEnabled: false, mfaSecret: null });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(mfaService.verifyMfaLogin(tempToken, '123456')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('throws UnauthorizedError when tempToken hash does not match (replay attack)', async () => {
      const user = makeUser({
        mfaEnabled: true,
        mfaSecret: 'v1:encrypted-secret',
        mfaTempTokenHash: hashToken('different-legitimate-token'),
      });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(mfaService.verifyMfaLogin('attacker-token', '123456')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('throws UnauthorizedError for invalid TOTP code', async () => {
      (verifySync as jest.Mock).mockReturnValue({ valid: false, delta: null });
      const tempToken = 'mfa-temp-token';
      const user = makeUser({
        mfaEnabled: true,
        mfaSecret: 'v1:encrypted-secret',
        mfaTempTokenHash: hashToken(tempToken),
      });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(mfaService.verifyMfaLogin(tempToken, '000000')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('treats null mfaTempTokenHash as mismatch', async () => {
      const user = makeUser({
        mfaEnabled: true,
        mfaSecret: 'v1:encrypted-secret',
        mfaTempTokenHash: null,
      });
      (verifyMfaToken as jest.Mock).mockReturnValue({ userId: 'user-uuid' });
      (userRepository.findById as jest.Mock).mockResolvedValue(user);

      await expect(mfaService.verifyMfaLogin('some-token', '123456')).rejects.toThrow(
        UnauthorizedError
      );
    });
  });
});
