import {
  MedicalRecord,
  Doctor,
  User,
  Symptom,
  Prescription,
  LabResult,
  MedicalAttachment,
} from '../models';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants';

class MedicalRecordRepository {
  async findAllByPatientId(
    patientId: string,
    page = 1,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<{ records: MedicalRecord[]; total: number }> {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    const result = await MedicalRecord.findAndCountAll({
      where: { patientId },
      distinct: true,
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }],
        },
        { model: Symptom, as: 'symptoms' },
        { model: Prescription, as: 'prescriptions' },
        { model: LabResult, as: 'labResults' },
        { model: MedicalAttachment, as: 'attachments' },
      ],
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset,
    });

    // Sequelize's findAndCountAll with include widens `rows` to `Model[]`;
    // cast back to the concrete type that this query always returns.
    const records = result.rows;
    const total: number = result.count;

    return { records, total };
  }
}

export const medicalRecordRepository = new MedicalRecordRepository();
