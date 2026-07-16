import { sequelize } from '../config/database';
import { logger } from '../config/logger';
import { NotFoundError } from '../shared/errors';
import { doctorRepository, DoctorFilters } from '../repositories/doctor.repository';
import { appointmentRepository } from '../repositories/appointment.repository';
import { Doctor, Patient, DoctorLanguage, DoctorQualification } from '../models';
import type { DoctorQualification as DoctorQualificationModel } from '../models/DoctorQualification.model';

export { DoctorFilters } from '../repositories/doctor.repository';

export interface SafeDoctorUpdateData {
  specialization?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
}

export interface QualificationInput {
  degree: string;
  institution: string;
  year: number;
}

class DoctorService {
  async getDoctors(filters: DoctorFilters): Promise<{ doctors: Doctor[]; total: number }> {
    return doctorRepository.findAll(filters);
  }

  async getDoctorById(id: string): Promise<Doctor> {
    const doctor = await doctorRepository.findById(id, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor not found');
    return doctor;
  }

  async getDoctorByUserId(userId: string): Promise<Doctor> {
    const doctor = await doctorRepository.findByUserId(userId, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor profile not found');
    return doctor;
  }

  async updateDoctorProfile(userId: string, rawData: Partial<Doctor>): Promise<Doctor> {
    const doctor = await this.getDoctorByUserId(userId);

    const safeData: SafeDoctorUpdateData = {};
    if (rawData.specialization !== undefined) safeData.specialization = rawData.specialization;
    if (rawData.licenseNumber !== undefined) safeData.licenseNumber = rawData.licenseNumber;
    if (rawData.yearsOfExperience !== undefined)
      safeData.yearsOfExperience = rawData.yearsOfExperience;
    if (rawData.consultationFee !== undefined) safeData.consultationFee = rawData.consultationFee;
    if (rawData.bio !== undefined) safeData.bio = rawData.bio;

    await doctorRepository.update(doctor, safeData as Partial<Doctor>);
    logger.info(`Doctor profile updated for user: ${userId}`);
    return this.getDoctorById(doctor.id);
  }

  /** Replace all languages for a doctor atomically. */
  async updateDoctorLanguages(userId: string, languages: string[]): Promise<DoctorLanguage[]> {
    const doctor = await this.getDoctorByUserId(userId);

    return sequelize.transaction(async t => {
      await DoctorLanguage.destroy({ where: { doctorId: doctor.id }, transaction: t });
      const langs = languages.length > 0 ? languages : ['English'];
      return DoctorLanguage.bulkCreate(
        langs.map(language => ({ doctorId: doctor.id, language })),
        { transaction: t, ignoreDuplicates: true }
      );
    });
  }

  /** Replace all qualifications for a doctor atomically. */
  async updateDoctorQualifications(
    userId: string,
    qualifications: QualificationInput[]
  ): Promise<DoctorQualificationModel[]> {
    const doctor = await this.getDoctorByUserId(userId);

    return sequelize.transaction(async t => {
      await DoctorQualification.destroy({ where: { doctorId: doctor.id }, transaction: t });
      if (qualifications.length === 0) return [];
      return DoctorQualification.bulkCreate(
        qualifications.map(q => ({ doctorId: doctor.id, ...q })),
        { transaction: t }
      );
    });
  }

  async getDoctorPatients(
    userId: string,
    page = 1,
    limit = 25
  ): Promise<{ patients: Patient[]; total: number }> {
    const doctor = await this.getDoctorByUserId(userId);
    return appointmentRepository.findPatientsByDoctorId(doctor.id, page, limit);
  }
}

export const doctorService = new DoctorService();
