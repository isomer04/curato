import { User } from './User.model';
import { Doctor } from './Doctor.model';
import { Patient } from './Patient.model';
import { Appointment } from './Appointment.model';
import { MedicalRecord } from './MedicalRecord.model';
import { DoctorAvailability } from './Availability.model';
import { Notification } from './Notification.model';
import { Message } from './Message.model';
import { Insurance } from './Insurance.model';
import { PatientAllergy } from './PatientAllergy.model';
import { DoctorQualification } from './DoctorQualification.model';
import { DoctorLanguage } from './DoctorLanguage.model';
import { Symptom } from './Symptom.model';
import { Prescription } from './Prescription.model';
import { LabResult } from './LabResult.model';
import { MedicalAttachment } from './MedicalAttachment.model';
import './PhiAuditLog.model';

export { User } from './User.model';
export { Doctor } from './Doctor.model';
export { Patient } from './Patient.model';
export { Appointment } from './Appointment.model';
export { MedicalRecord } from './MedicalRecord.model';
export { DoctorAvailability } from './Availability.model';
export { Notification } from './Notification.model';
export { Message } from './Message.model';
export { Insurance } from './Insurance.model';
export { PatientAllergy } from './PatientAllergy.model';
export { DoctorQualification } from './DoctorQualification.model';
export { DoctorLanguage } from './DoctorLanguage.model';
export { Symptom } from './Symptom.model';
export { Prescription } from './Prescription.model';
export { LabResult } from './LabResult.model';
export { MedicalAttachment } from './MedicalAttachment.model';
export { PhiAuditLog } from './PhiAuditLog.model';
export { PhiAction, PhiResourceType, AuditOutcome } from './PhiAuditLog.model';

export const initializeAssociations = (): void => {
  // RESTRICT: cannot hard-delete a User who has a Doctor profile (HIPAA retention).
  User.hasOne(Doctor, {
    foreignKey: 'userId',
    as: 'doctorProfile',
    onDelete: 'RESTRICT',
  });
  Doctor.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'RESTRICT',
  });

  User.hasOne(Patient, {
    foreignKey: 'userId',
    as: 'patientProfile',
    onDelete: 'RESTRICT',
  });
  Patient.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'RESTRICT',
  });

  Doctor.hasMany(Appointment, {
    foreignKey: 'doctorId',
    as: 'appointments',
    onDelete: 'RESTRICT',
  });
  Appointment.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
    onDelete: 'RESTRICT',
  });

  Patient.hasMany(Appointment, {
    foreignKey: 'patientId',
    as: 'appointments',
    onDelete: 'RESTRICT',
  });
  Appointment.belongsTo(Patient, {
    foreignKey: 'patientId',
    as: 'patient',
    onDelete: 'RESTRICT',
  });

  // SET NULL: if the cancelling user is removed, preserve the appointment but clear the actor.
  User.hasMany(Appointment, {
    foreignKey: 'cancelledBy',
    as: 'cancelledAppointments',
    onDelete: 'SET NULL',
  });
  Appointment.belongsTo(User, {
    foreignKey: 'cancelledBy',
    as: 'cancelledByUser',
    onDelete: 'SET NULL',
  });

  Doctor.hasMany(MedicalRecord, {
    foreignKey: 'doctorId',
    as: 'medicalRecords',
    onDelete: 'RESTRICT',
  });
  MedicalRecord.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
    onDelete: 'RESTRICT',
  });

  Patient.hasMany(MedicalRecord, {
    foreignKey: 'patientId',
    as: 'medicalRecords',
    onDelete: 'RESTRICT',
  });
  MedicalRecord.belongsTo(Patient, {
    foreignKey: 'patientId',
    as: 'patient',
    onDelete: 'RESTRICT',
  });

  Appointment.hasOne(MedicalRecord, {
    foreignKey: 'appointmentId',
    as: 'medicalRecord',
    onDelete: 'RESTRICT',
  });
  MedicalRecord.belongsTo(Appointment, {
    foreignKey: 'appointmentId',
    as: 'appointment',
    onDelete: 'RESTRICT',
  });

  Doctor.hasMany(DoctorAvailability, {
    foreignKey: 'doctorId',
    as: 'availabilities',
    onDelete: 'RESTRICT',
  });
  DoctorAvailability.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
    onDelete: 'RESTRICT',
  });

  // CASCADE: notifications are non-clinical UI state; they follow the user.
  User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE',
  });
  Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  User.hasMany(Message, {
    foreignKey: 'senderId',
    as: 'sentMessages',
    onDelete: 'RESTRICT',
  });
  Message.belongsTo(User, {
    foreignKey: 'senderId',
    as: 'sender',
    onDelete: 'RESTRICT',
  });

  User.hasMany(Message, {
    foreignKey: 'receiverId',
    as: 'receivedMessages',
    onDelete: 'RESTRICT',
  });
  Message.belongsTo(User, {
    foreignKey: 'receiverId',
    as: 'receiver',
    onDelete: 'RESTRICT',
  });

  Patient.hasMany(Insurance, {
    foreignKey: 'patientId',
    as: 'insurances',
    onDelete: 'RESTRICT',
  });
  Insurance.belongsTo(Patient, {
    foreignKey: 'patientId',
    as: 'patient',
    onDelete: 'RESTRICT',
  });

  // CASCADE: allergies are profile data; they belong to and travel with the patient.
  Patient.hasMany(PatientAllergy, {
    foreignKey: 'patientId',
    as: 'allergies',
    onDelete: 'CASCADE',
  });
  PatientAllergy.belongsTo(Patient, {
    foreignKey: 'patientId',
    as: 'patient',
    onDelete: 'CASCADE',
  });

  Doctor.hasMany(DoctorQualification, {
    foreignKey: 'doctorId',
    as: 'qualifications',
    onDelete: 'CASCADE',
  });
  DoctorQualification.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
    onDelete: 'CASCADE',
  });

  Doctor.hasMany(DoctorLanguage, {
    foreignKey: 'doctorId',
    as: 'languages',
    onDelete: 'CASCADE',
  });
  DoctorLanguage.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
    onDelete: 'CASCADE',
  });

  MedicalRecord.hasMany(Symptom, {
    foreignKey: 'medicalRecordId',
    as: 'symptoms',
    onDelete: 'CASCADE',
  });
  Symptom.belongsTo(MedicalRecord, {
    foreignKey: 'medicalRecordId',
    as: 'medicalRecord',
    onDelete: 'CASCADE',
  });

  MedicalRecord.hasMany(Prescription, {
    foreignKey: 'medicalRecordId',
    as: 'prescriptions',
    onDelete: 'CASCADE',
  });
  Prescription.belongsTo(MedicalRecord, {
    foreignKey: 'medicalRecordId',
    as: 'medicalRecord',
    onDelete: 'CASCADE',
  });

  MedicalRecord.hasMany(LabResult, {
    foreignKey: 'medicalRecordId',
    as: 'labResults',
    onDelete: 'CASCADE',
  });
  LabResult.belongsTo(MedicalRecord, {
    foreignKey: 'medicalRecordId',
    as: 'medicalRecord',
    onDelete: 'CASCADE',
  });

  MedicalRecord.hasMany(MedicalAttachment, {
    foreignKey: 'medicalRecordId',
    as: 'attachments',
    onDelete: 'CASCADE',
  });
  MedicalAttachment.belongsTo(MedicalRecord, {
    foreignKey: 'medicalRecordId',
    as: 'medicalRecord',
    onDelete: 'CASCADE',
  });
};
