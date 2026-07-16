import { Doctor, Patient } from './user.model';
import { Appointment } from './appointment.model';

export enum MedicalRecordType {
    CONSULTATION = 'consultation',
    DIAGNOSIS = 'diagnosis',
    LAB_RESULT = 'lab_result',
    PRESCRIPTION = 'prescription',
    SURGERY = 'surgery',
    VACCINATION = 'vaccination',
    OTHER = 'other',
}

export interface Symptom {
    id: string;
    medicalRecordId: string;
    symptomName: string;
    severity?: 'mild' | 'moderate' | 'severe';
}

export interface PrescriptionRecord {
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

export interface LabResult {
    id: string;
    medicalRecordId: string;
    testName: string;
    result: string;
    normalRange?: string;
    unit?: string;
    testedAt?: string;
    notes?: string;
}

export interface MedicalAttachment {
    id: string;
    medicalRecordId: string;
    storageKey: string;
    filename: string;
    mimeType: string;
    uploadedAt: string;
}

export interface MedicalRecord {
    id: string;
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    recordType: MedicalRecordType;
    diagnosis?: string;
    symptoms?: Symptom[];
    prescriptions?: PrescriptionRecord[];
    labResults?: LabResult[];
    attachments?: MedicalAttachment[];
    notes?: string;
    isConfidential: boolean;
    createdAt: string;
    updatedAt: string;

    // Virtual
    doctor?: Doctor;
    patient?: Patient;
    appointment?: Appointment;
}
