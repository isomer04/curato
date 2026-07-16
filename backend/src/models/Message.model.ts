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
import { User } from './User.model';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';

export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<string>;
  declare senderId: ForeignKey<User['id']>;
  declare receiverId: ForeignKey<User['id']>;
  declare content: string;
  declare isRead: CreationOptional<boolean>;
  declare readAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  declare sender?: NonAttribute<{ id: string; firstName: string; lastName: string; role: string }>;
  declare receiver?: NonAttribute<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }>;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    content: {
      // Message content is PHI in a healthcare context (symptoms, diagnoses,
      // medication questions). Encrypted at rest with AES-256-GCM using the
      // same encrypt/decrypt utility as insuranceInfo.
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000],
      },
      get(): string {
        const raw = this.getDataValue('content');
        if (!raw) return raw;
        try {
          return isEncrypted(raw as unknown as string)
            ? decrypt(raw as unknown as string)
            : (raw as unknown as string);
        } catch {
          return raw;
        }
      },
      set(value: string) {
        this.setDataValue('content', encrypt(value) as unknown as string);
      },
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
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
    tableName: 'messages',
    timestamps: true,
    paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
    underscored: true,
    indexes: [
      { fields: ['receiver_id'] },
      // Composite for conversation lookups: (sender A ↔ receiver B) queries.
      // Covers sender_id-leading queries too; the standalone sender_id index is redundant.
      { name: 'idx_messages_sender_receiver', fields: ['sender_id', 'receiver_id'] },
      // Composite for inbox queries: unread messages for a specific recipient.
      // is_read alone (boolean) is too low-cardinality to index usefully.
      {
        name: 'idx_messages_receiver_read_created',
        fields: ['receiver_id', 'is_read', 'created_at'],
      },
      { fields: ['created_at'] },
    ],
  }
);
