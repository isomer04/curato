import { UserRole, Gender } from './constants';
import { ApiUserContract } from '../contracts/generated-contracts';

/** Query parameters accepted by the admin user-list endpoint. */
export interface UserFilters {
  page: number;
  limit: number;
  role?: UserRole;
  /** Filter by active status. */
  isActive?: boolean;
  search?: string;
}

export interface User extends ApiUserContract {
  patientProfile?: Patient;
  doctorProfile?: Doctor;
}

export interface DoctorQualification {
  id?: string;
  degree: string;
  institution: string;
  year: number;
}

export interface DoctorLanguage {
  id?: string;
  language: string;
}

export interface PatientAllergy {
  id?: string;
  allergyName: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notedDate?: string;
}

export interface Doctor {
  id: string;
  userId: string;
  user?: User;
  // Virtual fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  consultationFee: number;
  bio?: string;
  qualifications?: DoctorQualification[];
  languages?: DoctorLanguage[];
  rating: number;
  totalPatients: number;
}

export interface Patient {
  id: string;
  userId: string;
  user?: User;
  // Virtual fields
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth: Date;
  gender?: Gender;
  bloodGroup?: string;
  allergies?: PatientAllergy[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
