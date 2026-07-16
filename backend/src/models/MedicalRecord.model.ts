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
import { MedicalRecordType } from '../types/constants';
import { Patient } from './Patient.model';
import { Doctor } from './Doctor.model';
import { Appointment } from './Appointment.model';

export class MedicalRecord extends Model<
    InferAttributes<MedicalRecord>,
    InferCreationAttributes<MedicalRecord>
> {
    declare id: CreationOptional<string>;
    declare patientId: ForeignKey<Patient['id']>;
    declare doctorId: ForeignKey<Doctor['id']>;
    declare appointmentId: CreationOptional<ForeignKey<Appointment['id']>>;
    declare recordType: MedicalRecordType;
    declare diagnosis: CreationOptional<string>;
    declare notes: CreationOptional<string>;
    declare isConfidential: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;

    declare patient?: NonAttribute<Patient>;
    declare doctor?: NonAttribute<Doctor>;
    declare appointment?: NonAttribute<Appointment>;
}

MedicalRecord.init(
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
        appointmentId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'appointments',
                key: 'id',
            },
        },
        recordType: {
            type: DataTypes.ENUM(...Object.values(MedicalRecordType)),
            allowNull: false,
        },
        diagnosis: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isConfidential: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        tableName: 'medical_records',
        timestamps: true,
        paranoid: true,
        underscored: true,
        indexes: [
            { fields: ['patient_id'] },
            { fields: ['doctor_id'] },
            { fields: ['appointment_id'] },
            { fields: ['created_at'] },
            {
                name: 'idx_medical_records_patient_type_created',
                fields: ['patient_id', 'record_type', 'created_at'],
            },
        ],
    }
);
