import { Transaction } from 'sequelize';
import { Patient, User } from '../models';

export interface CreatePatientData {
  userId: string;
  dateOfBirth: Date;
  gender: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

class PatientRepository {
  async findById(id: string, options: { withUser?: boolean } = {}): Promise<Patient | null> {
    const include = options.withUser
      ? [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
          },
        ]
      : [];

    return Patient.findByPk(id, { include });
  }

  async findByUserId(
    userId: string,
    options: { withUser?: boolean } = {}
  ): Promise<Patient | null> {
    const include = options.withUser ? [{ model: User, as: 'user' }] : [];
    return Patient.findOne({ where: { userId }, include });
  }

  async create(data: CreatePatientData, transaction?: Transaction): Promise<Patient> {
    return Patient.create(data as Patient['_creationAttributes'], { transaction });
  }

  async update(patient: Patient, data: Partial<Patient>): Promise<Patient> {
    return patient.update(data);
  }
}

export const patientRepository = new PatientRepository();
