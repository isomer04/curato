import { Op, WhereOptions, Transaction, Includeable, InferAttributes } from 'sequelize';
import { Appointment, Patient, Doctor, User } from '../models';
import { AppointmentStatus } from '../types/constants';
import { sequelize } from '../config/database';

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  reasonForVisit: string;
  status: AppointmentStatus;
}

export interface AppointmentFilters {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface UpdateAppointmentData {
  appointmentDate?: Date;
  startTime?: string;
  endTime?: string;
  reasonForVisit?: string;
  notes?: string;
  status?: AppointmentStatus;
  cancelledBy?: string;
  cancellationReason?: string;
}

/** Shared include for patient + doctor + their user profiles. */
const fullIncludes: Includeable[] = [
  {
    model: Patient,
    as: 'patient',
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
      },
    ],
  },
  {
    model: Doctor,
    as: 'doctor',
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
      },
    ],
  },
];

class AppointmentRepository {
  async findById(id: string): Promise<Appointment | null> {
    return Appointment.findByPk(id, { include: fullIncludes });
  }

  async findConflicting(
    doctorId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<Appointment | null> {
    const where: WhereOptions<Appointment> = {
      doctorId,
      appointmentDate,
      status: { [Op.notIn]: [AppointmentStatus.CANCELLED] },
      [Op.or]: [{ startTime: { [Op.lt]: endTime }, endTime: { [Op.gt]: startTime } }],
    };

    if (excludeId) {
      (where as Record<string, unknown>)['id'] = { [Op.ne]: excludeId };
    }

    return Appointment.findOne({ where });
  }

  /**
   * Fetch paginated appointments from pre-resolved filters.
   * The service is responsible for resolving role-based IDs before calling this.
   */
  async findAll(
    filters: AppointmentFilters
  ): Promise<{ appointments: Appointment[]; total: number }> {
    const { patientId, doctorId, status, startDate, endDate, page = 1, limit = 10 } = filters;
    const where: WhereOptions<Appointment> = {};

    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    if (startDate) {
      const current = (where.appointmentDate as object) || {};
      where.appointmentDate = { ...current, [Op.gte]: startDate };
    }

    if (endDate) {
      const current = (where.appointmentDate as object) || {};
      where.appointmentDate = { ...current, [Op.lte]: endDate };
    }

    const offset = (page - 1) * limit;
    const { rows: appointments, count: total } = await Appointment.findAndCountAll({
      where,
      include: fullIncludes,
      order: [
        ['appointmentDate', 'ASC'],
        ['startTime', 'ASC'],
      ],
      limit,
      offset,
      // distinct: required so COUNT(DISTINCT id) is used instead of COUNT(*), which
      // would overcount when JOINs produce multiple rows for one appointment.
      // subQuery: false prevents Sequelize from wrapping the query in a
      // "WHERE id IN (SELECT id ... LIMIT n)" subquery — MySQL does not allow LIMIT
      // inside an IN subquery. All includes here are belongs-to (one row per
      // appointment), so applying LIMIT directly on the JOIN is safe and correct.
      distinct: true,
      subQuery: false,
    });

    return { appointments, total };
  }

  /** All non-cancelled appointments for a doctor on a given date (for slot calculation). */
  async findBookedByDoctorAndDate(
    doctorId: string,
    appointmentDate: string
  ): Promise<Appointment[]> {
    return Appointment.findAll({
      where: {
        doctorId,
        appointmentDate,
        status: { [Op.notIn]: [AppointmentStatus.CANCELLED] },
      },
      attributes: ['startTime', 'endTime'],
    });
  }

  async create(data: CreateAppointmentData, transaction?: Transaction): Promise<Appointment> {
    return Appointment.create(data as Appointment['_creationAttributes'], { transaction });
  }

  async update(
    appointment: Appointment,
    data: UpdateAppointmentData,
    transaction?: Transaction
  ): Promise<Appointment> {
    return appointment.update(data, { transaction });
  }

  /** Targeted status update by id. */
  async updateStatusById(
    id: string,
    status: AppointmentStatus,
    transaction?: Transaction
  ): Promise<void> {
    await Appointment.update({ status }, { where: { id }, transaction });
  }

  /**
   * Return per-status appointment counts for a patient in one aggregate query.
   * Used by the dashboard stats endpoint to avoid transferring full appointment rows.
   */
  countByStatus(patientId: string): Promise<StatusCountRow[]> {
    return Appointment.findAll({
      where: { patientId },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      group: ['status'],
      raw: true,
    }) as unknown as Promise<StatusCountRow[]>;
  }

  async count(where?: WhereOptions<InferAttributes<Appointment>>): Promise<number> {
    return Appointment.count({ where });
  }

  async groupByStatus(): Promise<Array<{ status: string; count: number }>> {
    const rows = await Appointment.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });
    return rows as unknown as Array<{ status: string; count: number }>;
  }

  /**
   * Returns true when the given patient user and doctor user share at least one
   * completed appointment.  Used by the messaging layer to enforce the rule that
   * patients and doctors may only message each other after a completed visit.
   */
  async hasCompletedAppointmentBetweenUsers(
    patientUserId: string,
    doctorUserId: string
  ): Promise<boolean> {
    const appt = await Appointment.findOne({
      where: { status: AppointmentStatus.COMPLETED },
      include: [
        {
          model: Patient,
          as: 'patient',
          where: { userId: patientUserId },
          required: true,
          attributes: [],
        },
        {
          model: Doctor,
          as: 'doctor',
          where: { userId: doctorUserId },
          required: true,
          attributes: [],
        },
      ],
      attributes: ['id'],
    });
    return appt !== null;
  }

  /**
   * Return distinct patients who have an appointment with the given doctor.
   * Uses a single paginated query instead of iterating through all appointments.
   */
  async findPatientsByDoctorId(
    doctorId: string,
    page = 1,
    limit = 25
  ): Promise<{ patients: Patient[]; total: number }> {
    const offset = (page - 1) * limit;

    // Fetch distinct patient IDs for this doctor in one query
    const patientIdRows = (await Appointment.findAll({
      where: { doctorId },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('patient_id')), 'patientId']],
      raw: true,
      limit,
      offset,
    })) as unknown as Array<{ patientId: string }>;

    const patientIds = patientIdRows.map(r => r.patientId);

    const total = await Appointment.count({
      where: { doctorId },
      distinct: true,
      col: 'patient_id',
    });

    if (patientIds.length === 0) return { patients: [], total };

    const patients = await Patient.findAll({
      where: { id: patientIds },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
        },
      ],
      attributes: ['id', 'userId', 'dateOfBirth', 'gender', 'bloodGroup'],
    });

    return { patients, total };
  }
}

/** Shape returned by the countByStatus aggregate query. */
export interface StatusCountRow {
  status: AppointmentStatus;
  /** COUNT returns a string in raw Sequelize results. */
  count: string;
}

export const appointmentRepository = new AppointmentRepository();
