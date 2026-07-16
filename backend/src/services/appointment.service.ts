import { sequelize } from '../config/database';
import { AppointmentStatus, MedicalRecordType, UserRole } from '../types/constants';
import { addMinutesToTime, getDayOfWeek, doTimesOverlap } from '../utils/date.util';
import { logger } from '../config/logger';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../shared/errors';
import { Appointment, MedicalRecord, Prescription } from '../models';
import { AppEventBus, SystemEvents } from '../utils/eventBus.util';
import { DEFAULT_SLOT_DURATION_MINUTES } from '../config/constants';
import {
  appointmentRepository,
  patientRepository,
  doctorRepository,
  availabilityRepository,
} from '../repositories';


/**
 * Pre-aggregated appointment counts per status.
 * Returned by the dashboard-stats endpoint to avoid full record transfers.
 */
export interface AppointmentStatusCounts {
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface CreateAppointmentData {
  userId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  reasonForVisit: string;
}

export interface UpdateAppointmentData {
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  reasonForVisit?: string;
  notes?: string;
  status?: AppointmentStatus;
}

export interface PrescriptionInput {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
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

const DEFAULT_SLOT_DURATION = DEFAULT_SLOT_DURATION_MINUTES; // imported from config/constants — do not redeclare

class AppointmentService {
  async create(data: CreateAppointmentData): Promise<Appointment> {
    const { userId, doctorId, appointmentDate, startTime, reasonForVisit } = data;

    // Parallelize independent lookups — patient and doctor don't depend on each other
    const [patient, doctor] = await Promise.all([
      patientRepository.findByUserId(userId, { withUser: true }),
      doctorRepository.findById(doctorId, { withUser: true }),
    ]);
    if (!patient) throw new NotFoundError('Patient profile not found');
    if (!doctor) throw new NotFoundError('Doctor not found');
    const patientId = patient.id;

    const appointmentDateObj = new Date(appointmentDate);
    const dayOfWeek = getDayOfWeek(appointmentDateObj);

    const availability = await availabilityRepository.findForDay(
      doctorId,
      dayOfWeek,
      appointmentDate
    );
    if (!availability) throw new BadRequestError('Doctor is not available on this day');

    const endTime =
      data.endTime ||
      addMinutesToTime(startTime, availability.slotDuration || DEFAULT_SLOT_DURATION);

    if (startTime < availability.startTime || endTime > availability.endTime) {
      throw new BadRequestError(
        `Doctor's working hours on this day are ${availability.startTime} - ${availability.endTime}`
      );
    }

    const conflict = await appointmentRepository.findConflicting(
      doctorId,
      appointmentDate,
      startTime,
      endTime
    );
    if (conflict) throw new ConflictError('This time slot is already booked');

    return sequelize.transaction(async t => {
      const appointment = await appointmentRepository.create(
        {
          patientId,
          doctorId,
          appointmentDate: appointmentDateObj,
          startTime,
          endTime,
          reasonForVisit,
          status: AppointmentStatus.SCHEDULED,
        },
        t
      );

      if (doctor.user) {
        // Defer notification emission until after the transaction commits.
        // The notification subscriber fires the insert as a detached promise,
        // so emitting inside the transaction would race the auto-commit and
        // try to write through an already-committed transaction handle.
        const doctorUserId = doctor.user.id;
        const patientFullName = patient.user?.fullName;
        t.afterCommit(() => {
          AppEventBus.emit(SystemEvents.APPOINTMENT_CREATED, {
            userId: doctorUserId,
            title: 'New Appointment',
            message: `New appointment scheduled by ${patientFullName} on ${appointmentDate} at ${startTime}`,
            type: 'appointment_confirmed',
            metadata: { appointmentId: appointment.id, patientId: patient.id, appointmentDate },
          });
        });
      }

      logger.info(`Appointment created: ${appointment.id}`);
      return appointment;
    });
  }

  async getById(id: string): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found');
    return appointment;
  }

  /**
   * Fetch a single appointment and verify the requesting user has access.
   * Patients can only see their own appointments; doctors can only see theirs.
   */
  async getByIdForUser(id: string, userId: string, userRole: UserRole): Promise<Appointment> {
    const appointment = await this.getById(id);
    await this.checkAppointmentAccess(appointment, userId, userRole);
    return appointment;
  }

  async getAll(
    filters: AppointmentFilters,
    userId: string,
    userRole: UserRole
  ): Promise<{ appointments: Appointment[]; total: number }> {
    // Role-based ID resolution — admins can pass optional patientId/doctorId from query
    const resolvedFilters = { ...filters };

    if (userRole === UserRole.PATIENT) {
      const patient = await patientRepository.findByUserId(userId);
      if (!patient) throw new NotFoundError('Patient profile not found');
      resolvedFilters.patientId = patient.id;
    } else if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor) throw new NotFoundError('Doctor profile not found');
      resolvedFilters.doctorId = doctor.id;
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Unknown role');
    }

    return appointmentRepository.findAll(resolvedFilters);
  }

  async update(
    id: string,
    data: UpdateAppointmentData,
    userId: string,
    userRole: UserRole
  ): Promise<Appointment> {
    const appointment = await this.getById(id);
    await this.checkAppointmentAccess(appointment, userId, userRole);

    const immutable: AppointmentStatus[] = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.COMPLETED,
    ];
    if (immutable.includes(appointment.status)) {
      throw new BadRequestError('Cannot update a cancelled or completed appointment');
    }

    // Conflict check only when date/time is changing
    if (data.appointmentDate || data.startTime) {
      const newDate = data.appointmentDate || appointment.appointmentDate.toString();
      const newStart = data.startTime || appointment.startTime;
      const newEnd = data.endTime || appointment.endTime;

      if (!appointment.doctorId) {
        throw new BadRequestError('Appointment is missing doctor assignment');
      }

      const conflict = await appointmentRepository.findConflicting(
        appointment.doctorId,
        newDate,
        newStart,
        newEnd,
        id
      );
      if (conflict) throw new ConflictError('This time slot is already booked');
    }

    const { appointmentDate, ...rest } = data;
    const payload: Record<string, unknown> = { ...rest };
    if (appointmentDate) payload['appointmentDate'] = new Date(appointmentDate);

    await appointmentRepository.update(appointment, payload);

    logger.info(`Appointment updated: ${appointment.id}`);
    return this.getById(id);
  }

  async cancel(
    id: string,
    cancellationReason: string,
    userId: string,
    userRole: UserRole
  ): Promise<Appointment> {
    const appointment = await this.getById(id);
    await this.checkAppointmentAccess(appointment, userId, userRole);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestError('Appointment is already cancelled');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestError('Cannot cancel a completed appointment');
    }

    return sequelize.transaction(async t => {
      await appointmentRepository.update(
        appointment,
        { status: AppointmentStatus.CANCELLED, cancelledBy: userId, cancellationReason },
        t
      );

      const notifyUserId =
        userRole === UserRole.PATIENT
          ? appointment.doctor?.user?.id
          : appointment.patient?.user?.id;

      if (notifyUserId) {
        t.afterCommit(() => {
          AppEventBus.emit(SystemEvents.APPOINTMENT_CANCELLED, {
            userId: notifyUserId,
            title: 'Appointment Cancelled',
            message: `Appointment scheduled for ${String(appointment.appointmentDate)} at ${appointment.startTime} has been cancelled.`,
            type: 'appointment_cancelled',
            metadata: { appointmentId: id },
          });
        });
      }

      logger.info(`Appointment cancelled: ${appointment.id}`);
      return appointment;
    });
  }

  async confirm(id: string, userId: string, userRole: UserRole): Promise<Appointment> {
    if (userRole !== UserRole.DOCTOR && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only doctors can confirm appointments');
    }

    const appointment = await this.getById(id);

    if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError('You can only confirm your own appointments');
      }
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestError('Can only confirm scheduled appointments');
    }

    return sequelize.transaction(async t => {
      await appointmentRepository.update(appointment, { status: AppointmentStatus.CONFIRMED }, t);

      if (appointment.patient?.user?.id) {
        const patientUserId = appointment.patient.user.id;
        t.afterCommit(() => {
          AppEventBus.emit(SystemEvents.APPOINTMENT_CONFIRMED, {
            userId: patientUserId,
            title: 'Appointment Confirmed',
            message: `Your appointment on ${String(appointment.appointmentDate)} at ${appointment.startTime} has been confirmed.`,
            type: 'appointment_confirmed',
            metadata: { appointmentId: id },
          });
        });
      }

      logger.info(`Appointment confirmed: ${appointment.id}`);
      return appointment;
    });
  }

  async complete(
    id: string,
    notes: string | undefined,
    prescriptions: PrescriptionInput[] | undefined,
    userId: string,
    userRole: UserRole
  ): Promise<Appointment> {
    if (userRole !== UserRole.DOCTOR && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only doctors can complete appointments');
    }

    const appointment = await this.getById(id);

    if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError('You can only complete your own appointments');
      }
    }

    const completable: AppointmentStatus[] = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
    ];
    if (!completable.includes(appointment.status)) {
      throw new BadRequestError('Can only complete scheduled or confirmed appointments');
    }

    await sequelize.transaction(async t => {
      await appointment.update({ status: AppointmentStatus.COMPLETED, notes }, { transaction: t });

      // Find or create a MedicalRecord for this appointment so prescriptions
      // have a proper clinical home rather than being stored on the appointment itself.
      const [medRecord] = await MedicalRecord.findOrCreate({
        where: { appointmentId: id },
        defaults: {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          appointmentId: id,
          recordType: MedicalRecordType.CONSULTATION,
          notes,
          isConfidential: false,
        },
        transaction: t,
      });

      if (notes && medRecord.notes !== notes) {
        await medRecord.update({ notes }, { transaction: t });
      }

      if (prescriptions && prescriptions.length > 0) {
        await Prescription.bulkCreate(
          prescriptions.map(p => ({ medicalRecordId: medRecord.id, ...p })),
          { transaction: t }
        );
      }
    });

    logger.info(`Appointment completed: ${appointment.id}`);
    return this.getById(id);
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new NotFoundError('Doctor not found');

    const dayOfWeek = getDayOfWeek(new Date(date));
    const availability = await availabilityRepository.findForDay(doctorId, dayOfWeek, date);
    if (!availability) return [];

    const allSlots = availability.getTimeSlots();
    const booked = await appointmentRepository.findBookedByDoctorAndDate(doctorId, date);

    return allSlots.filter(slot => {
      const slotEnd = addMinutesToTime(slot, availability.slotDuration);
      return !booked.some(apt => doTimesOverlap(slot, slotEnd, apt.startTime, apt.endTime));
    });
  }

  /**
   * Return pre-aggregated appointment counts per status for a patient's dashboard.
   *
   * Uses a single GROUP BY query instead of fetching every appointment row,
   * keeping the response payload small and the query fast.
   */
  async getDashboardStats(userId: string): Promise<AppointmentStatusCounts> {
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) throw new NotFoundError('Patient profile not found');

    const rows = await appointmentRepository.countByStatus(patient.id);

    const counts: AppointmentStatusCounts = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    for (const row of rows) {
      const key = row.status as keyof AppointmentStatusCounts;
      if (key in counts) {
        counts[key] = parseInt(row.count, 10);
      }
    }

    return counts;
  }


  private async checkAppointmentAccess(
    appointment: Appointment,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    if (userRole === UserRole.ADMIN) return;

    if (userRole === UserRole.PATIENT) {
      const patient = await patientRepository.findByUserId(userId);
      if (!patient || patient.id !== appointment.patientId) {
        throw new ForbiddenError('You can only access your own appointments');
      }
    }

    if (userRole === UserRole.DOCTOR) {
      const doctor = await doctorRepository.findByUserId(userId);
      if (!doctor || doctor.id !== appointment.doctorId) {
        throw new ForbiddenError('You can only access your own appointments');
      }
    }
  }
}

export const appointmentService = new AppointmentService();
