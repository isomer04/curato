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

export class LabResult extends Model<
    InferAttributes<LabResult>,
    InferCreationAttributes<LabResult>
> {
    declare id: CreationOptional<string>;
    declare medicalRecordId: ForeignKey<MedicalRecord['id']>;
    declare testName: string;
    declare result: string;
    declare normalRange: CreationOptional<string | null>;
    declare unit: CreationOptional<string | null>;
    declare testedAt: CreationOptional<string | null>;
    declare notes: CreationOptional<string | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare medicalRecord?: NonAttribute<MedicalRecord>;
}

LabResult.init(
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
        testName: {
            type: DataTypes.STRING(300),
            allowNull: false,
            validate: { notEmpty: true },
        },
        result: {
            type: DataTypes.STRING(500),
            allowNull: false,
            validate: { notEmpty: true },
        },
        normalRange: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        testedAt: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        notes: {
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
        tableName: 'lab_results',
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ['medical_record_id'] }],
    }
);
