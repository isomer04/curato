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

export const MedicalRecordType = {
  CONSULTATION: 'consultation',
  DIAGNOSIS: 'diagnosis',
  LAB_RESULT: 'lab_result',
  PRESCRIPTION: 'prescription',
  SURGERY: 'surgery',
  VACCINATION: 'vaccination',
  OTHER: 'other',
} as const;

export type MedicalRecordType = (typeof MedicalRecordType)[keyof typeof MedicalRecordType];

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

export const NotificationType = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  NEW_MESSAGE: 'new_message',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const InsuranceStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type InsuranceStatus = (typeof InsuranceStatus)[keyof typeof InsuranceStatus];

export const Severity = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];
