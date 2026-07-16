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
import { Severity } from '../types/constants';
import { MedicalRecord } from './MedicalRecord.model';

export class Symptom extends Model<
    InferAttributes<Symptom>,
    InferCreationAttributes<Symptom>
> {
    declare id: CreationOptional<string>;
    declare medicalRecordId: ForeignKey<MedicalRecord['id']>;
    declare symptomName: string;
    declare severity: CreationOptional<Severity | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare medicalRecord?: NonAttribute<MedicalRecord>;
}

Symptom.init(
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
        symptomName: {
            type: DataTypes.STRING(300),
            allowNull: false,
            validate: { notEmpty: true },
        },
        severity: {
            type: DataTypes.ENUM(...Object.values(Severity)),
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
        tableName: 'symptoms',
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ['medical_record_id'] }],
    }
);
