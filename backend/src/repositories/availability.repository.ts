import { Op, InferAttributes, Transaction } from 'sequelize';
import { DoctorAvailability, Doctor } from '../models';
import { DayOfWeek } from '../types/constants';

export interface CreateAvailabilityData {
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface UpdateAvailabilityData {
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
  isActive?: boolean;
  effectiveTo?: Date;
}

class AvailabilityRepository {
  async findById(id: string): Promise<DoctorAvailability | null> {
    return DoctorAvailability.findByPk(id);
  }

  async findByDoctorId(doctorId: string): Promise<DoctorAvailability[]> {
    return DoctorAvailability.findAll({
      where: { doctorId, isActive: true },
      order: [
        ['dayOfWeek', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });
  }

  /** Find active availability for a doctor on a specific day and date. */
  async findForDay(
    doctorId: string,
    dayOfWeek: string,
    date: string
  ): Promise<DoctorAvailability | null> {
    return DoctorAvailability.findOne({
      where: {
        doctorId,
        dayOfWeek,
        isActive: true,
        effectiveFrom: { [Op.lte]: date },
        [Op.or]: [
          { effectiveTo: { [Op.eq]: null as unknown as Date } },
          { effectiveTo: { [Op.gte]: date } },
        ],
      },
    });
  }

  async findOverlapping(
    doctorId: string,
    dayOfWeek: DayOfWeek,
    effectiveFrom: string,
    effectiveTo?: string
  ): Promise<DoctorAvailability | null> {
    return DoctorAvailability.findOne({
      where: {
        doctorId,
        dayOfWeek,
        isActive: true,
        effectiveFrom: { [Op.lte]: effectiveTo || '9999-12-31' },
        [Op.or]: [
          { effectiveTo: { [Op.eq]: null as unknown as Date } },
          { effectiveTo: { [Op.gte]: effectiveFrom } },
        ],
      },
    });
  }

  async create(data: CreateAvailabilityData, transaction?: Transaction): Promise<DoctorAvailability> {
    return DoctorAvailability.create(data as DoctorAvailability['_creationAttributes'], { transaction });
  }

  async bulkCreate(items: CreateAvailabilityData[], transaction?: Transaction): Promise<DoctorAvailability[]> {
    return DoctorAvailability.bulkCreate(
      items as DoctorAvailability['_creationAttributes'][],
      { transaction, validate: true }
    );
  }

  async update(
    availability: DoctorAvailability,
    data: UpdateAvailabilityData
  ): Promise<DoctorAvailability> {
    return availability.update(data as Partial<InferAttributes<DoctorAvailability>>);
  }

  async delete(availability: DoctorAvailability): Promise<void> {
    await availability.destroy();
  }

  /** Deactivate all active availability records for a doctor (used when setting a new weekly schedule). */
  async deactivateAll(doctorId: string, effectiveTo: Date, transaction?: Transaction): Promise<void> {
    await DoctorAvailability.update(
      { isActive: false, effectiveTo },
      { where: { doctorId, isActive: true }, transaction }
    );
  }

  /** Check if a doctor exists by primary key. */
  async doctorExists(doctorId: string): Promise<boolean> {
    const doctor = await Doctor.findByPk(doctorId, { attributes: ['id'] });
    return doctor !== null;
  }
}

export const availabilityRepository = new AvailabilityRepository();
