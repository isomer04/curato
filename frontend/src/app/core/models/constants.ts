export const UserRole = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;

export type Gender = (typeof Gender)[keyof typeof Gender];

export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const DayOfWeek = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday',
} as const;

export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export const InsuranceStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type InsuranceStatus = (typeof InsuranceStatus)[keyof typeof InsuranceStatus];
