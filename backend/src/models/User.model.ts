import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import { UserRole } from '../types/constants';
import { hashPassword, comparePassword as comparePasswordUtil } from '../utils/password.util';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare password: string;
  declare role: UserRole;
  declare firstName: string;
  declare lastName: string;
  declare phoneNumber: CreationOptional<string>;
  declare isActive: CreationOptional<boolean>;
  declare isEmailVerified: CreationOptional<boolean>;
  declare lastLoginAt: CreationOptional<Date>;
  declare refreshToken: CreationOptional<string | null>;
  declare loginAttempts: CreationOptional<number>;
  declare lockoutUntil: CreationOptional<Date | null>;
  declare mfaEnabled: CreationOptional<boolean>;
  declare mfaSecret: CreationOptional<string | null>;
  // Single-use hash for MFA temp tokens – prevents replay attacks
  declare mfaTempTokenHash: CreationOptional<string | null>;
  // Password-reset flow
  declare passwordResetTokenHash: CreationOptional<string | null>;
  declare passwordResetExpiresAt: CreationOptional<Date | null>;
  // Email-verification token (hex digest, single-use)
  declare emailVerificationTokenHash: CreationOptional<string | null>;
  declare emailVerificationExpiresAt: CreationOptional<Date | null>;
  // Email-change flow
  declare emailChangePending: CreationOptional<string | null>;
  declare emailChangeTokenHash: CreationOptional<string | null>;
  declare emailChangeExpiresAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  get fullName(): NonAttribute<string> {
    return `${this.firstName} ${this.lastName}`;
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return comparePasswordUtil(candidatePassword, this.password);
  }

  isLocked(): boolean {
    return this.lockoutUntil !== null && this.lockoutUntil > new Date();
  }

  toSafeObject(): Omit<InferAttributes<User>, 'password' | 'refreshToken' | 'mfaSecret'> {
    const { password: _, refreshToken: __, mfaSecret: ___, ...safeUser } = this.toJSON();
    return safeUser;
  }
}

/**
 * Safe user type — User model with all sensitive fields omitted.
 * Use this as the return type wherever user data is sent to clients.
 */
export type SafeUser = ReturnType<User['toSafeObject']>;

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [8, 255],
      },
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.PATIENT,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lockoutUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mfaSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    mfaTempTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailVerificationTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailVerificationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailChangePending: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailChangeTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailChangeExpiresAt: {
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
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['role'] }],
    defaultScope: {
      attributes: {
        exclude: [
          'password',
          'refreshToken',
          'mfaSecret',
          'mfaTempTokenHash',
          'passwordResetTokenHash',
          'emailVerificationTokenHash',
          'emailChangeTokenHash',
        ],
      },
    },
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.password) {
          user.password = await hashPassword(user.password);
        }
      },
      beforeUpdate: async (user: User) => {
        // Only hash the password if it was explicitly changed.
        // Do NOT hash if the value was already pre-hashed by the service layer
        // (e.g. changePassword passes a pre-hashed value with hooks:false).
        if (user.changed('password')) {
          user.password = await hashPassword(user.password);
        }
      },
    },
  }
);
