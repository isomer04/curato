import { SafeUser } from '../models/User.model';
import { UserRole, Gender } from '../types/constants';
import crypto from 'node:crypto';

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
}

export interface RegisterPatientData extends RegisterUserData {
  dateOfBirth: string;
  gender: Gender;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface RegisterDoctorData extends RegisterUserData {
  specialization: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  languages?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user?: SafeUser;
  accessToken?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  tempToken?: string;
}

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
