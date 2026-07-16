import { Insurance } from '../models';
import { InsuranceStatus, UserRole } from '../types/constants';
import { NotFoundError, ForbiddenError } from '../shared/errors';
import { logger } from '../config/logger';
import { patientRepository } from '../repositories/patient.repository';
import { insuranceRepository } from '../repositories/insurance.repository';


export interface CreateInsuranceInput {
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

export interface UpdateInsuranceInput {
  providerName?: string;
  policyNumber?: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberRelation?: string;
  planType?: string;
  coverageStartDate?: string;
  coverageEndDate?: string;
  copayAmount?: number;
  deductibleAmount?: number;
}

export interface VerifyInsuranceInput {
  status: InsuranceStatus;
  notes?: string;
}


class InsuranceService {

  /**
   * Resolve patientId from a JWT userId.
   * Used internally — controllers never touch the Patient model.
   */
  private async resolvePatientId(userId: string): Promise<string> {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new NotFoundError('Patient profile not found');
    return patient.id;
  }


  /**
   * Create a new insurance record for the authenticated user.
   */
  async create(userId: string, input: CreateInsuranceInput): Promise<Insurance> {
    const patientId = await this.resolvePatientId(userId);

    const insurance = await insuranceRepository.create({
      patientId,
      providerName: input.providerName,
      policyNumber: input.policyNumber,
      groupNumber: input.groupNumber,
      subscriberName: input.subscriberName,
      subscriberRelation: input.subscriberRelation || 'self',
      planType: input.planType,
      coverageStartDate: new Date(input.coverageStartDate),
      coverageEndDate: input.coverageEndDate ? new Date(input.coverageEndDate) : undefined,
      copayAmount: input.copayAmount,
      deductibleAmount: input.deductibleAmount,
      verificationStatus: InsuranceStatus.PENDING,
    });

    logger.info(`Insurance created for patient ${patientId}: ${insurance.id}`);
    return insurance;
  }

  /**
   * Update an insurance record — scoped to the authenticated user's patient.
   */
  async update(id: string, userId: string, input: UpdateInsuranceInput): Promise<Insurance> {
    const patientId = await this.resolvePatientId(userId);
    const insurance = await this.findByIdOrFail(id);

    if (insurance.patientId !== patientId) {
      throw new ForbiddenError('Not authorized to update this insurance record');
    }

    const payload: Record<string, unknown> = {};
    if (input.providerName !== undefined) payload['providerName'] = input.providerName;
    if (input.policyNumber !== undefined) payload['policyNumber'] = input.policyNumber;
    if (input.groupNumber !== undefined) payload['groupNumber'] = input.groupNumber;
    if (input.subscriberName !== undefined) payload['subscriberName'] = input.subscriberName;
    if (input.subscriberRelation !== undefined)
      payload['subscriberRelation'] = input.subscriberRelation;
    if (input.planType !== undefined) payload['planType'] = input.planType;
    if (input.coverageStartDate !== undefined)
      payload['coverageStartDate'] = new Date(input.coverageStartDate);
    if (input.coverageEndDate !== undefined)
      payload['coverageEndDate'] = new Date(input.coverageEndDate);
    if (input.copayAmount !== undefined) payload['copayAmount'] = input.copayAmount;
    if (input.deductibleAmount !== undefined) payload['deductibleAmount'] = input.deductibleAmount;

    await insuranceRepository.update(insurance, payload as Partial<Insurance>);
    logger.info(`Insurance updated: ${id}`);
    return insurance;
  }

  /**
   * Verify an insurance record — admin/staff action only.
   */
  async verify(id: string, input: VerifyInsuranceInput): Promise<Insurance> {
    const insurance = await this.findByIdOrFail(id);

    await insuranceRepository.update(insurance, {
      verificationStatus: input.status,
      verificationDate: new Date(),
      verificationNotes: input.notes,
    } as Partial<Insurance>);

    logger.info(`Insurance ${id} verified with status: ${input.status}`);
    return insurance;
  }

  /**
   * Deactivate an insurance record — scoped to the authenticated user's patient.
   */
  async deactivate(id: string, userId: string): Promise<Insurance> {
    const patientId = await this.resolvePatientId(userId);
    const insurance = await this.findByIdOrFail(id);

    if (insurance.patientId !== patientId) {
      throw new ForbiddenError('Not authorized to deactivate this insurance record');
    }

    await insuranceRepository.update(insurance, { isActive: false } as Partial<Insurance>);
    logger.info(`Insurance deactivated: ${id}`);
    return insurance;
  }

  async delete(id: string, userId: string): Promise<void> {
    const patientId = await this.resolvePatientId(userId);
    const insurance = await this.findByIdOrFail(id);

    if (insurance.patientId !== patientId) {
      throw new ForbiddenError('Not authorized to delete this insurance record');
    }

    await insuranceRepository.delete(insurance);
    logger.info(`Insurance deleted: ${id}`);
  }


  /** All insurance records for the authenticated user. */
  async getAll(userId: string): Promise<Insurance[]> {
    const patientId = await this.resolvePatientId(userId);
    return insuranceRepository.findByPatientId(patientId);
  }

  /** Single record by ID — patients are scoped to their own records; doctors/admins see any. */
  async getById(id: string, requesterId: string, requesterRole: UserRole): Promise<Insurance> {
    const insurance = await this.findByIdOrFail(id);
    if (requesterRole === UserRole.PATIENT) {
      const patientId = await this.resolvePatientId(requesterId);
      if (insurance.patientId !== patientId) {
        throw new ForbiddenError('Not authorized to view this insurance record');
      }
    }
    return insurance;
  }

  /** Active, verified insurance for the authenticated user. */
  async getActive(userId: string): Promise<Insurance | null> {
    const patientId = await this.resolvePatientId(userId);
    return insuranceRepository.findActive(patientId);
  }

  /** All insurance records for a specific patient — admin use. */
  async getByPatientId(patientId: string): Promise<Insurance[]> {
    return insuranceRepository.findByPatientId(patientId);
  }


  private async findByIdOrFail(id: string): Promise<Insurance> {
    const insurance = await insuranceRepository.findById(id);
    if (!insurance) throw new NotFoundError('Insurance record not found');
    return insurance;
  }
}

export const insuranceService = new InsuranceService();
