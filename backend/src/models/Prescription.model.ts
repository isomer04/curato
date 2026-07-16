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
import { MedicalRecord } from './MedicalRecord.model';

export class Prescription extends Model<
    InferAttributes<Prescription>,
    InferCreationAttributes<Prescription>
> {
    declare id: CreationOptional<string>;
    declare medicalRecordId: ForeignKey<MedicalRecord['id']>;
    declare medication: string;
    declare dosage: string;
    declare frequency: string;
    declare duration: string;
    declare startDate: CreationOptional<string | null>;
    declare endDate: CreationOptional<string | null>;
    declare instructions: CreationOptional<string | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare medicalRecord?: NonAttribute<MedicalRecord>;
}

Prescription.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        medicalRecordId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'medical_records', key: 'id' },
        },
        medication: {
            type: DataTypes.STRING(300),
            allowNull: false,
            validate: { notEmpty: true },
        },
        dosage: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: true },
        },
        frequency: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: true },
        },
        duration: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: true },
        },
        startDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        endDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        instructions: {
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
    },
    {
        sequelize,
        tableName: 'prescriptions',
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ['medical_record_id'] }],
    }
);
