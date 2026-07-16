import { Request, Response } from 'express';
import { authService } from '../services';
import { successResponse, createdResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import {
  AuthenticatedRequest,
  TypedBody,
  AuthenticatedBodyRequest,
} from '../types/express-augment';
import type {
  RegisterBody,
  RegisterPatientBody,
  RegisterDoctorBody,
  LoginBody,
  ChangePasswordBody,
  UpdateProfileBody,
  RequestEmailChangeBody,
  ConfirmEmailChangeBody,
  MfaLoginBody,
  SetupMfaVerifyBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  VerifyEmailBody,
  ResendVerificationBody,
} from '../dto/auth.dto';
import { UserRole } from '../types/constants';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
} from '../utils/cookie.util';
import { UnauthorizedError } from '../shared/errors';
import { userService } from '../services';

export const register = asyncHandler(async (req: TypedBody<RegisterBody>, res: Response) => {
  const { email, password, firstName, lastName, phoneNumber, role } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role: role || UserRole.PATIENT,
  });

  // Refresh token → secure HttpOnly cookie (not in response body)
  setRefreshTokenCookie(res, result.refreshToken!);

  createdResponse(
    res,
    { user: result.user, accessToken: result.accessToken },
    'Registration successful'
  );
});

export const registerPatient = asyncHandler(async (req: TypedBody<RegisterPatientBody>, res: Response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  const result = await authService.registerPatient({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    allergies,
    emergencyContactName,
    emergencyContactPhone,
  });

  setRefreshTokenCookie(res, result.refreshToken!);

  createdResponse(
    res,
    { user: result.user, accessToken: result.accessToken },
    'Patient registration successful'
  );
});

export const registerDoctor = asyncHandler(async (req: TypedBody<RegisterDoctorBody>, res: Response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    specialization,
    licenseNumber,
    yearsOfExperience,
    consultationFee,
    bio,
    languages,
  } = req.body;

  const result = await authService.registerDoctor({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    specialization,
    licenseNumber,
    yearsOfExperience,
    consultationFee,
    bio,
    languages,
  });

  setRefreshTokenCookie(res, result.refreshToken!);

  createdResponse(
    res,
    { user: result.user, accessToken: result.accessToken },
    'Doctor registration successful'
  );
});


export const login = asyncHandler(async (req: TypedBody<LoginBody>, res: Response) => {
  const { email, password, rememberMe } = req.body;

  const result = await authService.login({ email, password });

  if (result.mfaRequired) {
    // Return 200 OK with mfaRequired flag, frontend will navigate to MFA screen
    successResponse(res, { mfaRequired: true, tempToken: result.tempToken }, 'MFA token required');
    return;
  }

  // Refresh token → secure HttpOnly cookie; honour rememberMe preference for TTL
  setRefreshTokenCookie(res, result.refreshToken!, rememberMe ?? true);

  successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
});

export const verifyMfaLogin = asyncHandler(async (req: TypedBody<MfaLoginBody>, res: Response) => {
  const { tempToken, token } = req.body;

  const result = await authService.verifyMfaLogin(tempToken, token);

  // Refresh token → secure HttpOnly cookie
  setRefreshTokenCookie(res, result.refreshToken!);

  successResponse(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await authService.logout(req.user.userId);

  clearRefreshTokenCookie(res);

  successResponse(res, null, 'Logged out successfully');
});


export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Read the refresh token from the HttpOnly cookie (not the request body)
  const token = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;

  if (!token) {
    throw new UnauthorizedError('No refresh token provided');
  }

  const tokens = await authService.refreshToken(token);

  // Rotate: set the new refresh token as a fresh HttpOnly cookie
  setRefreshTokenCookie(res, tokens.refreshToken);

  successResponse(res, { accessToken: tokens.accessToken }, 'Token refreshed successfully');
});


export const changePassword = asyncHandler(async (req: AuthenticatedBodyRequest<ChangePasswordBody>, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.userId, currentPassword, newPassword);

  clearRefreshTokenCookie(res);

  successResponse(res, null, 'Password changed successfully');
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.getUserById(req.user.userId);
  successResponse(res, user);
});

export const updateProfile = asyncHandler(async (req: AuthenticatedBodyRequest<UpdateProfileBody>, res: Response) => {
  const { firstName, lastName, phoneNumber } = req.body;
  const updated = await userService.updateProfile(req.user.userId, {
    firstName,
    lastName,
    phoneNumber,
  });
  successResponse(res, updated, 'Profile updated successfully');
});

export const requestEmailChange = asyncHandler(async (req: AuthenticatedBodyRequest<RequestEmailChangeBody>, res: Response) => {
  const { newEmail } = req.body;
  await authService.requestEmailChange(req.user.userId, newEmail);
  successResponse(
    res,
    null,
    `A confirmation link has been sent to ${newEmail}. Click it to complete the change.`
  );
});

export const confirmEmailChange = asyncHandler(async (req: TypedBody<ConfirmEmailChangeBody>, res: Response) => {
  const { token } = req.body;
  await authService.confirmEmailChange(token);
  successResponse(
    res,
    null,
    'Email changed successfully. Please log in again with your new email address.'
  );
});


export const setupMfa = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await authService.setupMfa(req.user.userId);
  successResponse(res, result, 'MFA setup initiated');
});

export const verifySetupMfa = asyncHandler(async (req: AuthenticatedBodyRequest<SetupMfaVerifyBody>, res: Response) => {
  const { token } = req.body;
  await authService.verifySetupMfa(req.user.userId, token);
  successResponse(res, null, 'MFA enabled successfully');
});


export const forgotPassword = asyncHandler(async (req: TypedBody<ForgotPasswordBody>, res: Response) => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  // Always success — prevents email enumeration
  successResponse(res, null, 'If that email is registered you will receive a reset link shortly');
});

export const resetPassword = asyncHandler(async (req: TypedBody<ResetPasswordBody>, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  successResponse(
    res,
    null,
    'Password has been reset successfully. Please log in with your new password.'
  );
});


export const verifyEmail = asyncHandler(async (req: TypedBody<VerifyEmailBody>, res: Response) => {
  const { token } = req.body;
  await authService.verifyEmail(token);
  successResponse(res, null, 'Email verified successfully. You can now log in.');
});

export const resendVerification = asyncHandler(async (req: TypedBody<ResendVerificationBody>, res: Response) => {
  const { email } = req.body;
  await authService.resendVerificationEmail(email);
  // Always success — prevents email enumeration
  successResponse(
    res,
    null,
    'If that email is registered and unverified, a new verification link has been sent.'
  );
});
