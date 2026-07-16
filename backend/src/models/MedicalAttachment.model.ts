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

export class MedicalAttachment extends Model<
    InferAttributes<MedicalAttachment>,
    InferCreationAttributes<MedicalAttachment>
> {
    declare id: CreationOptional<string>;
    declare medicalRecordId: ForeignKey<MedicalRecord['id']>;
    /** Storage key (e.g. S3 object key, GCS path). */
    declare storageKey: string;
    declare filename: string;
    declare mimeType: string;
    declare uploadedAt: CreationOptional<Date>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare medicalRecord?: NonAttribute<MedicalRecord>;
}

MedicalAttachment.init(
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
        storageKey: {
            type: DataTypes.STRING(1000),
            allowNull: false,
            validate: { notEmpty: true },
        },
        filename: {
            type: DataTypes.STRING(500),
            allowNull: false,
            validate: { notEmpty: true },
        },
        mimeType: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: true },
        },
        uploadedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
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
        tableName: 'medical_attachments',
        timestamps: true,
        underscored: true,
        indexes: [{ fields: ['medical_record_id'] }],
    }
);
