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

export class DoctorLanguage extends Model<
    InferAttributes<DoctorLanguage>,
    InferCreationAttributes<DoctorLanguage>
> {
    declare id: CreationOptional<string>;
    declare doctorId: ForeignKey<Doctor['id']>;
    declare language: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare doctor?: NonAttribute<Doctor>;
}

DoctorLanguage.init(
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
        language: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: true },
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
        tableName: 'doctor_languages',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['doctor_id'] },
            {
                name: 'uq_doctor_language',
                unique: true,
                fields: ['doctor_id', 'language'],
            },
        ],
    }
);
