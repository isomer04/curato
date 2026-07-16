import { z } from 'zod';
import { UserRole, Gender } from '../types/constants';
import { MAX_PASSWORD_LENGTH } from '../config/constants';
import { trimmedString, emailString, passwordString, trimmedText } from '../utils/zod.util';


/**
 * Password schema applying all strength rules.
 * Capped at MAX_PASSWORD_LENGTH (bcrypt's 72-byte limit) to avoid silent truncation.
 * NOTE: Passwords are NOT trimmed - whitespace is intentional if user types it.
 */
const passwordSchema = passwordString()
  .min(8, 'Password must be between 8 and 128 characters')
  .max(MAX_PASSWORD_LENGTH, `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

const baseRegisterFields = {
  email: emailString().max(255, 'Email must not exceed 255 characters'),
  password: passwordSchema,
  confirmPassword: passwordString(),
  firstName: trimmedString()
    .min(1, 'First name is required')
    .max(100, 'First name must be between 1 and 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  lastName: trimmedString()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be between 1 and 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes'
    ),
  phoneNumber: trimmedString()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number must be a valid international format (7-15 digits)')
    .max(20, 'Phone number must not exceed 20 characters')
    .optional(),
};


export const RegisterBodySchema = z
  .strictObject({
    ...baseRegisterFields,
    role: z
      .enum([UserRole.PATIENT, UserRole.DOCTOR], {
        message: `Role must be one of: ${UserRole.PATIENT}, ${UserRole.DOCTOR}`,
      })
      .optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match password',
    path: ['confirmPassword'],
  });

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const RegisterPatientBodySchema = z
  .strictObject({
    ...baseRegisterFields,
    // patient-specific
    dateOfBirth: z
      .string()
      .datetime({ message: 'Please provide a valid date of birth' })
      .refine(
        val => {
          const dob = new Date(val);
          const today = new Date();
          return dob < today;
        },
        { message: 'Date of birth must be in the past' }
      )
      .refine(
        val => {
          const dob = new Date(val);
          const maxAge = new Date();
          maxAge.setFullYear(maxAge.getFullYear() - 150);
          return dob >= maxAge;
        },
        { message: 'Please provide a valid date of birth' }
      ),
    gender: z.nativeEnum(Gender, {
      message: `Gender must be one of: ${Object.values(Gender).join(', ')}`,
    }),
    bloodGroup: z
      .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as [string, ...string[]], {
        message: 'Invalid blood group',
      })
      .optional(),
    allergies: z.array(z.string({ message: 'Each allergy must be a string' })).optional(),
    emergencyContactName: z
      .string()
      .max(100, 'Emergency contact name must not exceed 100 characters')
      .optional(),
    emergencyContactPhone: z
      .string()
      .regex(
        /^\+?[1-9]\d{6,14}$/,
        'Phone number must be a valid international format (7-15 digits)'
      )
      .max(20, 'Phone number must not exceed 20 characters')
      .optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match password',
    path: ['confirmPassword'],
  });

export type RegisterPatientBody = z.infer<typeof RegisterPatientBodySchema>;

export const RegisterDoctorBodySchema = z
  .strictObject({
    ...baseRegisterFields,
    // doctor-specific
    specialization: trimmedString()
      .min(2, 'Specialization is required')
      .max(100, 'Specialization must be between 2 and 100 characters'),
    licenseNumber: trimmedString()
      .min(5, 'License number is required')
      .max(50, 'License number must be between 5 and 50 characters'),
    yearsOfExperience: z
      .number()
      .int()
      .min(0, 'Years of experience must be between 0 and 70')
      .max(70, 'Years of experience must be between 0 and 70')
      .optional(),
    consultationFee: z.number().positive('Consultation fee must be a positive number').optional(),
    bio: trimmedText().max(2000, 'Bio must not exceed 2000 characters').optional(),
    languages: z.array(trimmedString()).optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Password confirmation does not match password',
    path: ['confirmPassword'],
  });

export type RegisterDoctorBody = z.infer<typeof RegisterDoctorBodySchema>;

export const LoginBodySchema = z.strictObject({
  email: emailString(),
  password: passwordString().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;

export const ChangePasswordBodySchema = z
  .strictObject({
    currentPassword: passwordString().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: passwordString(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'New password must be different from current password',
        path: ['newPassword'],
      });
    }
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Password confirmation does not match new password',
        path: ['confirmNewPassword'],
      });
    }
  });

export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>;

export const PatientProfileBodySchema = z.strictObject({
  dateOfBirth: z
    .string()
    .datetime({ message: 'Please provide a valid date of birth' })
    .refine(
      val => {
        const dob = new Date(val);
        const today = new Date();
        return dob < today;
      },
      { message: 'Date of birth must be in the past' }
    )
    .refine(
      val => {
        const dob = new Date(val);
        const maxAge = new Date();
        maxAge.setFullYear(maxAge.getFullYear() - 150);
        return dob >= maxAge;
      },
      { message: 'Please provide a valid date of birth' }
    ),
  gender: z.nativeEnum(Gender, {
    message: `Gender must be one of: ${Object.values(Gender).join(', ')}`,
  }),
  bloodGroup: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as [string, ...string[]], {
      message: 'Invalid blood group',
    })
    .optional(),
  allergies: z.array(trimmedString()).optional(),
  emergencyContactName: trimmedString()
    .max(100, 'Emergency contact name must not exceed 100 characters')
    .optional(),
  emergencyContactPhone: trimmedString()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      'Phone number must be a valid international format (7-15 digits)'
    )
    .max(20, 'Phone number must not exceed 20 characters')
    .optional(),
});

export type PatientProfileBody = z.infer<typeof PatientProfileBodySchema>;

export const DoctorProfileBodySchema = z.strictObject({
  specialization: trimmedString()
    .min(2, 'Specialization is required')
    .max(100, 'Specialization must be between 2 and 100 characters'),
  licenseNumber: trimmedString()
    .min(5, 'License number is required')
    .max(50, 'License number must be between 5 and 50 characters'),
  yearsOfExperience: z
    .number()
    .int()
    .min(0, 'Years of experience must be between 0 and 70')
    .max(70, 'Years of experience must be between 0 and 70')
    .optional(),
  consultationFee: z.number().positive('Consultation fee must be a positive number').optional(),
  bio: trimmedText().max(2000, 'Bio must not exceed 2000 characters').optional(),
  languages: z.array(trimmedString()).optional(),
});

export type DoctorProfileBody = z.infer<typeof DoctorProfileBodySchema>;

export const MfaLoginBodySchema = z.strictObject({
  tempToken: trimmedString().min(1, 'Temporary token is required'),
  token: trimmedString()
    .length(6, 'MFA code must be exactly 6 digits')
    .regex(/^\d+$/, 'MFA code must be numeric'),
});

export type MfaLoginBody = z.infer<typeof MfaLoginBodySchema>;

export const SetupMfaVerifyBodySchema = z.strictObject({
  token: trimmedString()
    .length(6, 'MFA code must be exactly 6 digits')
    .regex(/^\d+$/, 'MFA code must be numeric'),
});

export type SetupMfaVerifyBody = z.infer<typeof SetupMfaVerifyBodySchema>;

export const ForgotPasswordBodySchema = z.strictObject({
  email: emailString().max(255, 'Email must not exceed 255 characters'),
});

export type ForgotPasswordBody = z.infer<typeof ForgotPasswordBodySchema>;

export const ResetPasswordBodySchema = z
  .strictObject({
    token: trimmedString().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmNewPassword: passwordString(),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'Password confirmation does not match new password',
    path: ['confirmNewPassword'],
  });

export type ResetPasswordBody = z.infer<typeof ResetPasswordBodySchema>;

export const VerifyEmailBodySchema = z.strictObject({
  token: trimmedString().min(1, 'Verification token is required'),
});

export type VerifyEmailBody = z.infer<typeof VerifyEmailBodySchema>;

export const ResendVerificationBodySchema = z.strictObject({
  email: emailString().max(255, 'Email must not exceed 255 characters'),
});

export type ResendVerificationBody = z.infer<typeof ResendVerificationBodySchema>;

export const UpdateProfileBodySchema = z.strictObject({
  firstName: trimmedString()
    .min(1, 'First name is required')
    .max(100, 'First name must be between 1 and 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes'
    )
    .optional(),
  lastName: trimmedString()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be between 1 and 100 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes'
    )
    .optional(),
  phoneNumber: trimmedString()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number must be a valid international format (7-15 digits)')
    .max(20, 'Phone number must not exceed 20 characters')
    .nullable()
    .optional(),
});

export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

export const RequestEmailChangeBodySchema = z.strictObject({
  newEmail: emailString().max(255, 'Email must not exceed 255 characters'),
});

export type RequestEmailChangeBody = z.infer<typeof RequestEmailChangeBodySchema>;

export const ConfirmEmailChangeBodySchema = z.strictObject({
  token: trimmedString().min(1, 'Confirmation token is required'),
});

export type ConfirmEmailChangeBody = z.infer<typeof ConfirmEmailChangeBodySchema>;


export const refreshTokenValidation = z.object({
  cookies: z.strictObject({
    refreshToken: z.string().optional(),
  }),
});

export const registerValidation = z.object({ body: RegisterBodySchema });
export const registerPatientValidation = z.object({ body: RegisterPatientBodySchema });
export const registerDoctorValidation = z.object({ body: RegisterDoctorBodySchema });
export const loginValidation = z.object({ body: LoginBodySchema });
export const changePasswordValidation = z.object({ body: ChangePasswordBodySchema });
export const updateProfileValidation = z.object({ body: UpdateProfileBodySchema });
export const requestEmailChangeValidation = z.object({ body: RequestEmailChangeBodySchema });
export const confirmEmailChangeValidation = z.object({ body: ConfirmEmailChangeBodySchema });
export const mfaLoginValidation = z.object({ body: MfaLoginBodySchema });
export const setupMfaVerifyValidation = z.object({ body: SetupMfaVerifyBodySchema });
export const forgotPasswordValidation = z.object({ body: ForgotPasswordBodySchema });
export const resetPasswordValidation = z.object({ body: ResetPasswordBodySchema });
export const verifyEmailValidation = z.object({ body: VerifyEmailBodySchema });
export const resendVerificationValidation = z.object({ body: ResendVerificationBodySchema });
export const doctorProfileValidation = z.object({ body: DoctorProfileBodySchema });
export const patientProfileValidation = z.object({ body: PatientProfileBodySchema });
