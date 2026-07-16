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
import { DayOfWeek } from '../types/constants';
import { Doctor } from './Doctor.model';
import { timeToMinutes } from '../utils/date.util';

export class DoctorAvailability extends Model<
    InferAttributes<DoctorAvailability>,
    InferCreationAttributes<DoctorAvailability>
> {
    declare id: CreationOptional<string>;
    declare doctorId: ForeignKey<Doctor['id']>;
    declare dayOfWeek: DayOfWeek;
    declare startTime: string;
    declare endTime: string;
    declare slotDuration: number; // in minutes
    declare isActive: CreationOptional<boolean>;
    declare effectiveFrom: Date;
    declare effectiveTo: CreationOptional<Date>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    // Soft-delete: retaining a historical trace of when a doctor was available
    // is relevant for auditing booking windows and resolving scheduling disputes.
    declare deletedAt: CreationOptional<Date | null>;

    declare doctor?: NonAttribute<Doctor>;

    getTimeSlots(): string[] {
        const slots: string[] = [];
        const [startHour, startMinute] = this.startTime.split(':').map(Number);
        const [endHour, endMinute] = this.endTime.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        while (currentMinutes < endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const minutes = currentMinutes % 60;
            slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            currentMinutes += this.slotDuration;
        }

        return slots;
    }
}

DoctorAvailability.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        doctorId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'doctors',
                key: 'id',
            },
        },
        dayOfWeek: {
            type: DataTypes.ENUM(...Object.values(DayOfWeek)),
            allowNull: false,
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        slotDuration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
            validate: {
                min: 15,
                max: 120,
            },
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        effectiveFrom: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        effectiveTo: {
            type: DataTypes.DATEONLY,
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
        tableName: 'doctor_availability',
        timestamps: true,
        paranoid: true, // Retain availability history for scheduling audits
        underscored: true,
        indexes: [
            { fields: ['doctor_id'] },
            { fields: ['day_of_week'] },
            {
                name: 'idx_avail_doctor_day_active',
                fields: ['doctor_id', 'day_of_week', 'is_active'],
            },
            {
                name: 'uq_avail_doctor_day_start_from',
                unique: true,
                fields: ['doctor_id', 'day_of_week', 'start_time', 'effective_from'],
            },
        ],
        validate: {
            endTimeAfterStartTime(this: DoctorAvailability) {
                // Use numeric comparison — string comparison of '9:00' >= '10:00' is true
                // because '9' > '1', so un-padded times fail incorrectly.
                if (timeToMinutes(this.startTime) >= timeToMinutes(this.endTime)) {
                    throw new Error('End time must be after start time');
                }
            },
            effectiveToAfterFrom(this: DoctorAvailability) {
                if (this.effectiveTo && this.effectiveFrom >= this.effectiveTo) {
                    throw new Error('Effective to date must be after effective from date');
                }
            },
        },
    }
);
