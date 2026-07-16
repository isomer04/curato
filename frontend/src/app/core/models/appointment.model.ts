import { AppointmentStatus } from './constants';
import { Patient, Doctor } from './user.model';

export interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    patient?: Patient;
    doctor?: Doctor;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: AppointmentStatus;
    reasonForVisit: string;
    notes?: string;
    cancelledBy?: string;
    cancellationReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Prescription {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}

export interface TimeSlot {
    time: string;
    available: boolean;
}

export interface DoctorAvailability {
    id: string;
    doctorId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
    effectiveFrom: string;
    effectiveTo?: string;
}

export interface CreateAppointmentData {
    doctorId: string;
    appointmentDate: string;
    startTime: string;
    reasonForVisit: string;
}

export interface AppointmentFilters {
    page?: number;
    limit?: number;
    status?: AppointmentStatus;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    patientId?: string;
}
