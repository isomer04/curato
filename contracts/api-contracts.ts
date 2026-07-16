// Primitive / shared types

export type ContractUserRole = "patient" | "doctor" | "admin";
export type ContractGender = "male" | "female" | "other";
export type ContractBloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";
export type ContractAppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type ContractDayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type ContractMedicalRecordType =
  | "consultation"
  | "diagnosis"
  | "lab_result"
  | "prescription"
  | "surgery"
  | "vaccination"
  | "other";
export type ContractInsuranceStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

// Generic response wrapper — all endpoints follow this shape

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Shape returned by all error responses (4xx/5xx).
 * Unlike ApiResponse<T>, data is absent and errors may be present.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[] | Record<string, string[]>;
}

export interface ApiPaginatedResponse<T> {
  success: boolean;
  data: T;
  metadata: ApiPaginationMetadata;
  message?: string;
}

export interface ApiPaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User / Auth

export interface ApiUserContract {
  id: string;
  email: string;
  role: ContractUserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAuthResponseData {
  user: ApiUserContract;
  accessToken: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  tempToken?: string;
}

// MFA

export interface MfaSetupResponseContract {
  success: boolean;
  data: {
    qrCodeUrl: string;
    secret: string;
  };
  message?: string;
}

export interface MfaVerifyRequestContract {
  token: string;
}

export interface AdminUsersResponseContract {
  success: boolean;
  data: ApiUserContract[];
  metadata: ApiPaginationMetadata;
  message?: string;
}

// Registration

export interface PatientRegistrationRequestContract {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth: string;
  gender: ContractGender;
  bloodGroup?: ContractBloodGroup;
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface DoctorRegistrationRequestContract {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
  languages?: string[];
}

// Appointments

export interface ApiPrescriptionContract {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ApiAppointmentContract {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: ContractAppointmentStatus;
  reasonForVisit: string;
  notes?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  patient?: ApiPatientSummaryContract;
  doctor?: ApiDoctorSummaryContract;
}

export interface CreateAppointmentRequestContract {
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  reasonForVisit: string;
}

export interface AppointmentListResponseContract {
  success: boolean;
  data: ApiAppointmentContract[];
  metadata: ApiPaginationMetadata;
}

export interface AppointmentResponseContract {
  success: boolean;
  data: ApiAppointmentContract;
  message?: string;
}

export interface ApiAppointmentStatusCountsContract {
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DashboardStatsResponseContract {
  success: boolean;
  data: {
    stats: ApiAppointmentStatusCountsContract;
  };
}

// Doctor / Patient summaries (used inside other responses)

export interface ApiDoctorSummaryContract {
  id: string;
  userId: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  consultationFee: number;
  bio?: string;
  languages?: { id: string; language: string }[];
  rating: number;
  totalPatients: number;
  isApproved: boolean;
  user?: Pick<
    ApiUserContract,
    "id" | "firstName" | "lastName" | "email" | "phoneNumber"
  >;
}

export interface ApiPatientSummaryContract {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: ContractGender;
  bloodGroup?: ContractBloodGroup;
  allergies?: { id: string; allergyName: string; severity?: string }[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  user?: Pick<
    ApiUserContract,
    "id" | "firstName" | "lastName" | "email" | "phoneNumber"
  >;
}

// Doctor availability / schedule

export interface ApiAvailabilityContract {
  id: string;
  doctorId: string;
  dayOfWeek: ContractDayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ApiTimeSlotContract {
  time: string;
  available: boolean;
}

export interface AvailabilityResponseContract {
  success: boolean;
  data: {
    availability: ApiAvailabilityContract[];
  };
}

export interface TimeSlotsResponseContract {
  success: boolean;
  data: {
    slots: ApiTimeSlotContract[];
  };
}

// Medical records

export interface ApiPrescriptionRecordContract {
  id: string;
  medicalRecordId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  startDate?: string;
  endDate?: string;
  instructions?: string;
}

export interface ApiLabResultContract {
  id: string;
  medicalRecordId: string;
  testName: string;
  result: string;
  normalRange?: string;
  unit?: string;
  testedAt?: string;
  notes?: string;
}

export interface ApiMedicalAttachmentContract {
  id: string;
  medicalRecordId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  uploadedAt: string;
}

export interface ApiMedicalRecordContract {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  recordType: ContractMedicalRecordType;
  diagnosis?: string;
  symptoms?: { id: string; symptomName: string; severity?: string }[];
  prescriptions?: ApiPrescriptionRecordContract[];
  labResults?: ApiLabResultContract[];
  attachments?: ApiMedicalAttachmentContract[];
  notes?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
  doctor?: ApiDoctorSummaryContract;
  patient?: ApiPatientSummaryContract;
}

export interface MedicalRecordListResponseContract {
  success: boolean;
  data: ApiMedicalRecordContract[];
  metadata: ApiPaginationMetadata;
}

export interface MedicalRecordResponseContract {
  success: boolean;
  data: ApiMedicalRecordContract;
  message?: string;
}

// Messages

export interface ApiMessageUserContract {
  id: string;
  firstName: string;
  lastName: string;
  role: ContractUserRole;
}

export interface ApiMessageContract {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: ApiMessageUserContract;
  receiver?: ApiMessageUserContract;
}

export interface ApiConversationContract {
  userId: string;
  firstName: string;
  lastName: string;
  role: ContractUserRole;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface SendMessageRequestContract {
  receiverId: string;
  content: string;
}

export interface ConversationResponseContract {
  success: boolean;
  data: ApiMessageContract[];
  metadata: ApiPaginationMetadata;
  message?: string;
}

export interface ConversationListResponseContract {
  success: boolean;
  data: {
    conversations: ApiConversationContract[];
  };
}

export interface SendMessageResponseContract {
  success: boolean;
  data: {
    message: ApiMessageContract;
  };
}

export interface UnreadCountResponseContract {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

// Insurance

export interface ApiInsuranceContract {
  id: string;
  patientId: string;
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName: string;
  subscriberRelation: string;
  planType?: string;
  coverageStartDate: string;
  coverageEndDate?: string;
  copayAmount?: number;
  deductibleAmount?: number;
  deductibleMet?: number;
  verificationStatus: ContractInsuranceStatus;
  verificationDate?: string;
  verificationNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsuranceRequestContract {
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName: string;
  subscriberRelation?: string;
  planType?: string;
  coverageStartDate: string;
  coverageEndDate?: string;
  copayAmount?: number;
  deductibleAmount?: number;
}

export interface InsuranceResponseContract {
  success: boolean;
  data: {
    insurance: ApiInsuranceContract;
  };
  message?: string;
}

export interface InsuranceListResponseContract {
  success: boolean;
  data: {
    insurances: ApiInsuranceContract[];
  };
}

// Notifications

export type ContractNotificationType =
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "GENERAL";

export interface ApiNotificationContract {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: ContractNotificationType;
  isRead: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponseContract {
  success: boolean;
  data: ApiNotificationContract[];
  metadata: ApiPaginationMetadata;
}

export interface MarkNotificationsReadRequestContract {
  notificationIds: string[];
}
