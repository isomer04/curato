import { Doctor, User } from './user.model';
import { DoctorAvailability, Appointment } from './appointment.model';
import { AppointmentStatusCounts } from './dashboard.model';
import { AdminUsersResponseContract } from '../contracts/generated-contracts';

export interface AdminStatsApiResponse {
  data: {
    stats: {
      users: {
        total: number;
        byRole: Record<string, number>;
        active: number;
        inactive: number;
        verified: number;
        unverified: number;
      };
      appointments: {
        total: number;
        byStatus: Record<string, number>;
      };
    };
  };
}

export interface AppointmentStatsResponse {
  data: {
    stats: AppointmentStatusCounts;
  };
}

export interface AvailabilityResponse {
  data: {
    availability: DoctorAvailability[];
  };
}

export type DoctorsResponse = PaginatedResponse<Doctor>;

export type UserResponse = AdminUsersResponseContract & { data: User[] };

/** Discriminated union on mfaRequired for fully type-safe narrowing. */
export type AuthResponseData =
  | { mfaRequired: true; tempToken: string }
  | { mfaRequired?: false; user: User; accessToken: string };

export interface AuthResponse {
  success: boolean;
  data: AuthResponseData;
  message?: string;
}

export interface AppointmentResponse {
  success: boolean;
  data: {
    appointment: Appointment;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  metadata: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
