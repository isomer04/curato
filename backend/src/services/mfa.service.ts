import { timingSafeEqual } from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { verifyMfaToken, generateTokenPair } from '../utils/jwt.util';
import { logger } from '../config/logger';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../shared/errors';
import { userRepository } from '../repositories';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';
import { AuthResponse, hashToken } from './auth.types';

const EPOCH_TOLERANCE = 30;

class MfaService {
  async setupMfa(userId: string): Promise<{ qrCodeUrl: string; secret: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      label: user.email,
      issuer: 'HealthcareApp',
      secret,
    });

    const encryptedSecret = encrypt(secret);
    await userRepository.update(user, { mfaSecret: encryptedSecret });

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
    return { qrCodeUrl, secret };
  }

  async verifySetupMfa(userId: string, token: string): Promise<void> {
    const user = await userRepository.findById(userId, { withSensitive: true });
    if (!user || !user.mfaSecret) throw new BadRequestError('MFA setup not initiated');

    const decryptedSecret = isEncrypted(user.mfaSecret) ? decrypt(user.mfaSecret) : user.mfaSecret;

    const result = verifySync({ token, secret: decryptedSecret, epochTolerance: EPOCH_TOLERANCE });

    if (!result.valid) throw new UnauthorizedError('Invalid MFA token');

    await userRepository.update(user, { mfaEnabled: true });
    logger.info(`MFA enabled for user: ${user.email}`);
  }

  async verifyMfaLogin(tempToken: string, token: string): Promise<AuthResponse> {
    let decoded;
    try {
      decoded = verifyMfaToken(tempToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired MFA session');
    }

    const user = await userRepository.findById(decoded.userId, { withSensitive: true });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedError('MFA is not enabled for this user');
    }

    const incomingHash = hashToken(tempToken);
    const storedHash = user.mfaTempTokenHash ?? '';
    const isKnownToken =
      incomingHash.length === storedHash.length &&
      timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash));
    if (!isKnownToken) {
      throw new UnauthorizedError('Invalid or already-used MFA session');
    }

    await userRepository.update(user, { mfaTempTokenHash: null });

    const decryptedSecret = isEncrypted(user.mfaSecret) ? decrypt(user.mfaSecret) : user.mfaSecret;

    const result = verifySync({ token, secret: decryptedSecret, epochTolerance: EPOCH_TOLERANCE });

    if (!result.valid) throw new UnauthorizedError('Invalid MFA code');

    const tokens = generateTokenPair(user.id, user.email, user.role);
    await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) });

    logger.info(`User logged in via MFA: ${user.email}`);

    return {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}

export const mfaService = new MfaService();
