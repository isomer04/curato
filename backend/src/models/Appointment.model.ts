import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import { AppointmentStatus } from '../types/constants';
import { Patient } from './Patient.model';
import { Doctor } from './Doctor.model';
import { User } from './User.model';
import { timeToMinutes } from '../utils/date.util';

export class Appointment extends Model<
  InferAttributes<Appointment>,
  InferCreationAttributes<Appointment>
> {
  declare id: CreationOptional<string>;
  declare patientId: ForeignKey<Patient['id']>;
  declare doctorId: ForeignKey<Doctor['id']>;
  declare appointmentDate: Date;
  declare startTime: string;
  declare endTime: string;
  declare status: CreationOptional<AppointmentStatus>;
  declare reasonForVisit: string;
  declare notes: CreationOptional<string>;
  declare cancelledBy: CreationOptional<ForeignKey<User['id']>>;
  declare cancellationReason: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  declare patient?: NonAttribute<Patient>;
  declare doctor?: NonAttribute<Doctor>;
  declare cancelledByUser?: NonAttribute<User>;
}

Appointment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id',
      },
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'doctors',
        key: 'id',
      },
    },
    appointmentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        // Appointments must be for a future date
        // Patient.dateOfBirth (which validates the date is in the past).
        isFutureDate(value: string) {
          const today = new Date().toISOString().split('T')[0];
          if (value < today) {
            throw new Error('Appointment date must be today or in the future');
          }
        },
      },
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(AppointmentStatus)),
      allowNull: false,
      defaultValue: AppointmentStatus.SCHEDULED,
    },
    reasonForVisit: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 1000],
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // prescriptions column removed — see comment on declare block above.
    cancelledBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'appointments',
    timestamps: true,
    paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
    underscored: true,
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['doctor_id'] },
      { fields: ['appointment_date'] },
      { fields: ['status'] },
      // Composite index for conflict checking
      // Note: explicit name required (MySQL 64-char limit); no `where` clause
      // as MySQL does not support partial/conditional indexes.
      {
        name: 'uq_appt_doctor_date_start',
        unique: true,
        fields: ['doctor_id', 'appointment_date', 'start_time'],
      },
    ],
    validate: {
      endTimeAfterStartTime(this: Appointment) {
        // Use numeric comparison so un-padded values like '9:00' vs '08:00' work correctly.
        if (timeToMinutes(this.startTime) >= timeToMinutes(this.endTime)) {
          throw new Error('End time must be after start time');
        }
      },
    },
  }
);
