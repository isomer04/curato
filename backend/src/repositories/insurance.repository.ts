import { Insurance, Patient } from '../models';
import { InsuranceStatus } from '../types/constants';

export interface CreateInsuranceData {
  patientId: string;
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName: string;
  subscriberRelation?: string;
  planType?: string;
  coverageStartDate: Date;
  coverageEndDate?: Date;
  copayAmount?: number;
  deductibleAmount?: number;
  verificationStatus: InsuranceStatus;
}

class InsuranceRepository {
  async create(data: CreateInsuranceData): Promise<Insurance> {
    return Insurance.create(data as Insurance['_creationAttributes']);
  }

  async findById(id: string): Promise<Insurance | null> {
    return Insurance.findByPk(id, {
      include: [{ model: Patient, as: 'patient' }],
    });
  }

  async findByPatientId(patientId: string): Promise<Insurance[]> {
    return Insurance.findAll({
      where: { patientId },
      order: [['createdAt', 'DESC']],
    });
  }

  async findActive(patientId: string): Promise<Insurance | null> {
    return Insurance.findOne({
      where: {
        patientId,
        isActive: true,
        verificationStatus: InsuranceStatus.VERIFIED,
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async update(insurance: Insurance, data: Partial<Insurance>): Promise<Insurance> {
    return insurance.update(data);
  }

  async delete(insurance: Insurance): Promise<void> {
    await insurance.destroy();
  }
}

export const insuranceRepository = new InsuranceRepository();
