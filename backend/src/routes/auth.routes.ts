import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  loginRateLimitMiddleware,
  registrationRateLimitMiddleware,
  passwordResetRateLimitMiddleware,
} from '../middleware/rateLimit.middleware';
import {
  registerValidation,
  registerPatientValidation,
  registerDoctorValidation,
  loginValidation,
  mfaLoginValidation,
  changePasswordValidation,
  updateProfileValidation,
  requestEmailChangeValidation,
  confirmEmailChangeValidation,
  setupMfaVerifyValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  resendVerificationValidation,
} from '../dto/auth.dto';


const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  registrationRateLimitMiddleware,
  validate(registerValidation),
  authController.register
);

/**
 * @route   POST /api/v1/auth/register/patient
 * @desc    Register a new patient with profile
 * @access  Public
 */
router.post(
  '/register/patient',
  registrationRateLimitMiddleware,
  validate(registerPatientValidation),
  authController.registerPatient
);

/**
 * @route   POST /api/v1/auth/register/doctor
 * @desc    Register a new doctor with profile
 * @access  Public
 */
router.post(
  '/register/doctor',
  registrationRateLimitMiddleware,
  validate(registerDoctorValidation),
  authController.registerDoctor
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginRateLimitMiddleware,
  validate(loginValidation),
  authController.login
);

/**
 * @route   POST /api/v1/auth/verify-mfa
 * @desc    Verify MFA token for login
 * @access  Public
 */
router.post(
  '/verify-mfa',
  loginRateLimitMiddleware,
  validate(mfaLoginValidation),
  authController.verifyMfaLogin
);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordValidation),
  authController.changePassword
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @route   PATCH /api/v1/auth/profile
 * @desc    Update current user profile (name, phone)
 * @access  Private
 */
router.patch(
  '/profile',
  authMiddleware,
  validate(updateProfileValidation),
  authController.updateProfile
);

/**
 * @route   POST /api/v1/auth/request-email-change
 * @desc    Request an email address change — sends confirmation to new address
 * @access  Private
 */
router.post(
  '/request-email-change',
  authMiddleware,
  validate(requestEmailChangeValidation),
  authController.requestEmailChange
);

/**
 * @route   POST /api/v1/auth/confirm-email-change
 * @desc    Confirm an email address change using the token from the email
 * @access  Public
 */
router.post(
  '/confirm-email-change',
  validate(confirmEmailChangeValidation),
  authController.confirmEmailChange
);

/**
 * @route   POST /api/v1/auth/setup-mfa
 * @desc    Initialize MFA setup
 * @access  Private
 */
router.post('/setup-mfa', authMiddleware, authController.setupMfa);

/**
 * @route   POST /api/v1/auth/verify-setup-mfa
 * @desc    Verify token to finalize MFA setup
 * @access  Private
 */
router.post(
  '/verify-setup-mfa',
  authMiddleware,
  validate(setupMfaVerifyValidation),
  authController.verifySetupMfa
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request a password-reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetRateLimitMiddleware,
  validate(forgotPasswordValidation),
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token from email
 * @access  Public
 */
router.post(
  '/reset-password',
  passwordResetRateLimitMiddleware,
  validate(resetPasswordValidation),
  authController.resetPassword
);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address using token from registration email
 * @access  Public
 */
router.post(
  '/verify-email',
  validate(verifyEmailValidation),
  authController.verifyEmail
);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Re-send email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  passwordResetRateLimitMiddleware,
  validate(resendVerificationValidation),
  authController.resendVerification
);

export default router;
