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
import { Gender } from '../types/constants';
import { User } from './User.model';
import { encrypt, decrypt, isEncrypted } from '../utils/crypto.util';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export class Patient extends Model<
  InferAttributes<Patient, { omit: 'firstName' | 'lastName' | 'email' | 'phoneNumber' }>,
  InferCreationAttributes<Patient, { omit: 'firstName' | 'lastName' | 'email' | 'phoneNumber' }>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User['id']>;
  declare dateOfBirth: Date;
  declare gender: Gender;
  declare bloodGroup: CreationOptional<string>;
  declare emergencyContactName: CreationOptional<string>;
  declare emergencyContactPhone: CreationOptional<string>;
  // Stored as AES-256-GCM encrypted TEXT. PHI under HIPAA 18-identifier list
  // (geographic data more specific than state). Getter/setter handle transparent
  // encrypt/decrypt so application code works with plain Address objects.
  declare address: CreationOptional<Address | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  declare user?: NonAttribute<User>;


  get firstName(): string | undefined { return this.user?.firstName; }
  get lastName(): string | undefined { return this.user?.lastName; }
  get email(): string | undefined { return this.user?.email; }
  get phoneNumber(): string | undefined { return this.user?.phoneNumber; }

  override toJSON(): object {
    const base = super.toJSON() as Record<string, unknown>;
    if (this.user) {
      base['firstName'] = this.firstName;
      base['lastName'] = this.lastName;
      base['email'] = this.email;
      base['phoneNumber'] = this.phoneNumber;
    }
    return base;
  }
}

Patient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isInThePast(value: string) {
          const today = new Date().toISOString().split('T')[0];
          if (value >= today) {
            throw new Error('Date of birth must be in the past');
          }
        },
      },
    },
    gender: {
      type: DataTypes.ENUM(...Object.values(Gender)),
      allowNull: false,
    },
    bloodGroup: {
      type: DataTypes.STRING(5),
      allowNull: true,
      validate: {
        isIn: [['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']],
      },
    },
    emergencyContactName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    emergencyContactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {

      type: DataTypes.TEXT,
      allowNull: true,
      get(): Address | null {
        const raw = this.getDataValue('address');
        if (!raw) return null;
        const rawStr = raw as unknown as string;
        try {
          const json = isEncrypted(rawStr) ? decrypt(rawStr) : rawStr;
          return JSON.parse(json) as Address;
        } catch {
          return null;
        }
      },
      set(value: Address | null) {
        if (value === null || value === undefined) {
          this.setDataValue('address', null as unknown as Address);
          return;
        }
        const json = JSON.stringify(value);
        this.setDataValue('address', encrypt(json) as unknown as Address);
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'patients',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [{ fields: ['date_of_birth'] }],
  }
);
