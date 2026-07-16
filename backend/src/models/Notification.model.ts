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
import { NotificationType } from '../types/constants';
import { User } from './User.model';

export interface NotificationMetadata {
    appointmentId?: string;
    doctorId?: string;
    patientId?: string;
    appointmentDate?: string;
}

export class Notification extends Model<
    InferAttributes<Notification>,
    InferCreationAttributes<Notification>
> {
    declare id: CreationOptional<string>;
    declare userId: ForeignKey<User['id']>;
    declare type: NotificationType;
    declare title: string;
    declare message: string;
    declare isRead: CreationOptional<boolean>;
    declare metadata: CreationOptional<NotificationMetadata>;
    declare createdAt: CreationOptional<Date>;
    declare readAt: CreationOptional<Date>;
    // TTL column for cleanup jobs — without this, notifications accumulate
    // indefinitely. A periodic job can prune rows where expiresAt < NOW().
    declare expiresAt: CreationOptional<Date | null>;

    declare user?: NonAttribute<User>;
}

Notification.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        type: {
            type: DataTypes.ENUM(...Object.values(NotificationType)),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'notifications',
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
            { fields: ['user_id'] },
            { fields: ['type'] },
            { fields: ['created_at'] },
            // Composite for the dominant inbox query: unread notifications for a user,
            // newest first. is_read alone (boolean) is too low-cardinality to index usefully.
            { name: 'idx_notifications_user_read_created', fields: ['user_id', 'is_read', 'created_at'] },
            // Index for cleanup jobs: DELETE FROM notifications WHERE expires_at < NOW()
            { fields: ['expires_at'] },
        ],
    }
);
