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
import { Doctor } from './Doctor.model';

export class DoctorQualification extends Model<
    InferAttributes<DoctorQualification>,
    InferCreationAttributes<DoctorQualification>
> {
    declare id: CreationOptional<string>;
    declare doctorId: ForeignKey<Doctor['id']>;
    declare degree: string;
    declare institution: string;
    declare year: number;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare doctor?: NonAttribute<Doctor>;
}

DoctorQualification.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        doctorId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'doctors', key: 'id' },
        },
        degree: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: { notEmpty: true },
        },
        institution: {
            type: DataTypes.STRING(300),
            allowNull: false,
            validate: { notEmpty: true },
        },
        year: {
            type: DataTypes.SMALLINT,
            allowNull: false,
            validate: {
                min: 1900,
                isNotInFuture(value: number) {
                    if (value > new Date().getFullYear()) {
                        throw new Error('Year cannot be in the future');
                    }
                },
            },
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
        tableName: 'doctor_qualifications',
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ['doctor_id'] }],
    }
);
