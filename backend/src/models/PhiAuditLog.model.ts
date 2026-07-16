/**
 * PHI Audit Log Model (HIPAA Compliance - C-02)
 *
 * Records every access or export of Protected Health Information (PHI).
 * HIPAA requires audit controls that track who accessed what, when, and the outcome.
 *
 * This table is append-only; rows must NEVER be updated or deleted.
 * Retention policy: retain for a minimum of 6 years per HIPAA §164.530(j).
 */
import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import { sequelize } from '../config/database';
import { UserRole } from '../types/constants';

export const PhiAction = {
  VIEW_MEDICAL_RECORDS: 'view_medical_records',
  EXPORT_RECORDS_CSV: 'export_records_csv',
  EXPORT_RECORDS_PDF: 'export_records_pdf',
  BOOK_APPOINTMENT: 'book_appointment',
  VIEW_APPOINTMENT: 'view_appointment',
  UPDATE_APPOINTMENT: 'update_appointment',
  CANCEL_APPOINTMENT: 'cancel_appointment',
  CONFIRM_APPOINTMENT: 'confirm_appointment',
  COMPLETE_APPOINTMENT: 'complete_appointment',
  VIEW_PATIENT_PROFILE: 'view_patient_profile',
  VIEW_MESSAGES: 'view_messages',
  SEND_MESSAGE: 'send_message',
  VIEW_INSURANCE: 'view_insurance',
  MODIFY_INSURANCE: 'modify_insurance',
} as const;

export type PhiAction = (typeof PhiAction)[keyof typeof PhiAction];

export const PhiResourceType = {
  MEDICAL_RECORD: 'medical_record',
  APPOINTMENT: 'appointment',
  PATIENT_PROFILE: 'patient_profile',
  MESSAGE: 'message',
  INSURANCE: 'insurance',
} as const;

export type PhiResourceType = (typeof PhiResourceType)[keyof typeof PhiResourceType];

export const AuditOutcome = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

export type AuditOutcome = (typeof AuditOutcome)[keyof typeof AuditOutcome];

export class PhiAuditLog extends Model<
  InferAttributes<PhiAuditLog>,
  InferCreationAttributes<PhiAuditLog>
> {
  declare id: CreationOptional<string>;
  declare actorId: string | null;
  declare actorRole: UserRole | null;
  declare action: PhiAction;
  declare resourceType: PhiResourceType;
  declare patientId: string | null;
  declare resourceId: string | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare outcome: AuditOutcome;
  declare details: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
}

PhiAuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM(...Object.values(PhiAction)),
      allowNull: false,
    },
    resourceType: {
      type: DataTypes.ENUM(...Object.values(PhiResourceType)),
      allowNull: false,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45), // supports IPv6
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    outcome: {
      type: DataTypes.ENUM(...Object.values(AuditOutcome)),
      allowNull: false,
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'phi_audit_logs',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['patient_id'] },
      { fields: ['actor_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
    ],
  }
);
