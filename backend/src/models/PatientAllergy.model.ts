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
import { Patient } from './Patient.model';

export class PatientAllergy extends Model<
    InferAttributes<PatientAllergy>,
    InferCreationAttributes<PatientAllergy>
> {
    declare id: CreationOptional<string>;
    declare patientId: ForeignKey<Patient['id']>;
    declare allergyName: string;
    declare severity: CreationOptional<Severity | null>;
    declare notedDate: CreationOptional<Date | null>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare patient?: NonAttribute<Patient>;
}

PatientAllergy.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        patientId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'patients', key: 'id' },
        },
        allergyName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: { notEmpty: true },
        },
        severity: {
            type: DataTypes.ENUM(...Object.values(Severity)),
            allowNull: true,
        },
        notedDate: {
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
    },
    {
        sequelize,
        tableName: 'patient_allergies',
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ['patient_id'] }],
    }
);
