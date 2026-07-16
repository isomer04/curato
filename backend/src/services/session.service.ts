import crypto from 'node:crypto';
import { User } from '../models';
import { generateTokenPair, verifyRefreshToken, generateMfaToken } from '../utils/jwt.util';
import { logger } from '../config/logger';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../shared/errors';
import { userRepository, doctorRepository } from '../repositories';
import { isCommonPassword, hashPassword } from '../utils/password.util';
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from '../config/constants';
import { LoginCredentials, AuthResponse, hashToken } from './auth.types';
import { emailService } from './email.service';
import { sendEmailWithRetry } from '../utils/email-retry.util';
import { UserRole } from '../types/constants';

// Password-reset tokens expire after 1 hour
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;
// Email-verification tokens expire after 2 days
const EMAIL_VERIFICATION_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

class SessionService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    const user = await userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid email or password');

    if (user.isLocked()) {
      if (!user.lockoutUntil) {
        throw new UnauthorizedError('Your account has been locked due to multiple failed login attempts. Please contact support.');
      }

      const lockoutRemaining = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      
      if (lockoutRemaining <= 0) {
        // Lockout expired, clear it
        await userRepository.update(user, { loginAttempts: 0, lockoutUntil: null });
      } else {
        throw new UnauthorizedError(
          `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${lockoutRemaining} minute${lockoutRemaining === 1 ? '' : 's'}.`
        );
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedError(
        'Please verify your email address before logging in. Check your inbox for a verification link.'
      );
    }

    // Doctors must be approved by an admin before they can log in.
    if (user.role === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(user.id);
      if (doctor && !doctor.isApproved) {
        throw new UnauthorizedError(
          'Your doctor account is pending admin approval. You will receive an email once approved.'
        );
      }
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      const loginAttempts = user.loginAttempts + 1;
      const updates: Partial<User> = { loginAttempts };

      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000);
        logger.warn(`Account locked due to failed login attempts`);
      }

      await userRepository.update(user, updates);
      throw new UnauthorizedError('Invalid email or password');
    }

    // Even with correct password, don't allow login if account is still locked
    // This prevents bypassing lockout by guessing the correct password during lockout period
    if (user.isLocked()) {
      const lockoutRemaining = Math.ceil((user.lockoutUntil!.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(
        `Your account has been temporarily locked due to multiple failed login attempts. Please try again in ${lockoutRemaining} minute${lockoutRemaining === 1 ? '' : 's'}.`
      );
    }

    await userRepository.update(user, {
      loginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    });

    if (user.mfaEnabled) {
      const tempToken = generateMfaToken(user.id);
      // Store a hash of the temp token so it can only be used once.
      // Without this, a stolen tempToken could be replayed within its
      // 5-minute window to mint multiple access/refresh token pairs.
      await userRepository.update(user, { mfaTempTokenHash: hashToken(tempToken) });
      return {
        mfaRequired: true,
        tempToken,
      };
    }

    const tokens = generateTokenPair(user.id, user.email, user.role);
    await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) });

    logger.info(`User logged in successfully: ${user.id}`);

    return {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { userId } = verifyRefreshToken(refreshToken);

      const user = await userRepository.findById(userId, { withSensitive: true });
      if (!user) throw new UnauthorizedError('User not found');

      const incomingHash = hashToken(refreshToken);
      const storedHash = user.refreshToken ?? '';
      const isMatch =
        incomingHash.length === storedHash.length &&
        crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash));

      if (!isMatch) {
        await userRepository.update(user, { refreshToken: null });
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (!user.isActive) throw new UnauthorizedError('Account is deactivated');

      const tokens = generateTokenPair(user.id, user.email, user.role);
      await userRepository.update(user, { refreshToken: hashToken(tokens.refreshToken) });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (user) {
      await userRepository.update(user, { refreshToken: null });
      logger.info(`User logged out: ${user.id}`);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await userRepository.findById(userId, { withSensitive: true });
    if (!user) throw new NotFoundError('User not found');

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) throw new BadRequestError('Current password is incorrect');

    if (isCommonPassword(newPassword)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    const hashedNewPassword = await hashPassword(newPassword);
    await userRepository.updateWithoutHooks(user, {
      password: hashedNewPassword,
      refreshToken: null,
    });

    logger.info(`Password changed for user: ${user.id}`);
  }

  async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId, { withProfiles: true });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /**
   * Initiate a password-reset flow.
   *
   * Always responds with success (even for unknown emails) to prevent
   * user-enumeration attacks. The reset link is only emailed if the
   * account exists.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      // Return silently — do NOT reveal whether the email exists.
      logger.info('Password-reset requested for unknown/inactive account');
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await userRepository.update(user, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    });

    await emailService.sendPasswordResetEmail(user.email, user.firstName, rawToken);
    logger.info(`Password-reset email sent: userId=${user.id}`);
  }

  /**
   * Complete a password-reset using a raw token from the email link.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await userRepository.findByPasswordResetTokenHash(tokenHash);

    if (!user) throw new BadRequestError('Invalid or expired password reset token');
    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestError('Password reset token has expired. Please request a new one.');
    }

    if (isCommonPassword(newPassword)) {
      throw new BadRequestError('This password is too common. Please choose a stronger password.');
    }

    const hashedPassword = await hashPassword(newPassword);

    // Use updateWithoutHooks to bypass the beforeUpdate hook (password is already hashed)
    await userRepository.updateWithoutHooks(user, {
      password: hashedPassword,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      refreshToken: null, // invalidate all existing sessions
    });

    logger.info(`Password reset successfully`);
  }

  /**
   * Mark a user's email as verified when they click the link from the registration email.
   */
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await userRepository.findByEmailVerificationTokenHash(tokenHash);

    if (!user) throw new BadRequestError('Invalid or expired email verification token');
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestError('Email verification token has expired. Please request a new one.');
    }
    if (user.isEmailVerified) {
      // Idempotent — already verified, just clear the token
      await userRepository.update(user, {
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      });
      return;
    }

    await userRepository.update(user, {
      isEmailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });

    logger.info(`Email verified for user: ${user.id}`);
  }

  /**
   * Re-send an email-verification link.
   * Always responds with success to avoid leaking which emails are registered.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.isActive || user.isEmailVerified) {
      logger.info('Resend verification email skipped');
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
    await userRepository.update(user, {
      emailVerificationTokenHash: hashToken(rawToken),
      emailVerificationExpiresAt: expiresAt,
    });

    // Retry with backoff — don't silently swallow email failures
    void sendEmailWithRetry(
      () => emailService.sendEmailVerificationEmail(user.email, user.firstName, rawToken),
      `resend-verification userId=${user.id}`
    );

    logger.info(`Verification email resent: userId=${user.id}`);
  }

  /**
   * Step 1 of 2: user requests an email change.
   * Stores the desired new email (pending) and sends a confirmation link to
   * the NEW address. The current email stays active until confirmation.
   */
  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Block if new email is already taken by someone else
    const existing = await userRepository.findByEmail(newEmail);
    if (existing && existing.id !== userId) {
      throw new BadRequestError('That email address is already in use.');
    }

    if (user.email === newEmail) {
      throw new BadRequestError('The new email must be different from your current email.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);

    await userRepository.update(user, {
      emailChangePending: newEmail,
      emailChangeTokenHash: hashToken(rawToken),
      emailChangeExpiresAt: expiresAt,
    });

    await emailService.sendEmailChangeEmail(newEmail, user.firstName, rawToken);
    logger.info(`Email change requested: userId=${user.id}`);
  }

  /**
   * Step 2 of 2: user clicks the link in their NEW inbox.
   * Swaps the email and clears the pending fields.
   */
  async confirmEmailChange(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const user = await userRepository.findByEmailChangeTokenHash(tokenHash);

    if (!user) throw new BadRequestError('Invalid or expired email change token.');
    if (!user.emailChangeExpiresAt || user.emailChangeExpiresAt < new Date()) {
      throw new BadRequestError('Email change token has expired. Please request a new one.');
    }
    if (!user.emailChangePending) {
      throw new BadRequestError('No email change is pending for this account.');
    }

    const newEmail = user.emailChangePending;

    await userRepository.update(user, {
      email: newEmail,
      isEmailVerified: true,
      emailChangePending: null,
      emailChangeTokenHash: null,
      emailChangeExpiresAt: null,
      // Invalidate all sessions — user must log in again with the new email
      refreshToken: null,
    });

    logger.info(`Email changed successfully: userId=${user.id}`);
  }
}

export const sessionService = new SessionService();
