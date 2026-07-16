import {
  PatientRegistrationRequestContract,
  DoctorRegistrationRequestContract,
} from '../contracts/generated-contracts';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}


interface BaseRegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface GenericRegisterData extends BaseRegisterData {
  role?: 'patient' | 'doctor';
}

export type PatientRegisterData = PatientRegistrationRequestContract;

export type DoctorRegisterData = DoctorRegistrationRequestContract;

/**
 * Discriminated union for type-safe registration forms.
 * Use PatientRegisterData or DoctorRegisterData directly when the role is known.
 */
export type RegisterData = GenericRegisterData | PatientRegisterData | DoctorRegisterData;

/**
 * Access token returned in the response body.
 * The refresh token is kept in an HttpOnly cookie and never exposed to JS.
 */
export interface AuthTokens {
  accessToken: string;
}
