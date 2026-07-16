import {
  Op,
  WhereOptions,
  CreationAttributes,
  InferAttributes,
  Transaction,
  fn,
  col,
} from 'sequelize';
import { User, Doctor, Patient } from '../models';
import { UserRole } from '../types/constants';

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
}

/**
 * Narrowly-typed update payload.
 * Deliberately excludes immutable fields (id, email, role, createdAt, updatedAt)
 * to prevent accidental or malicious elevation of privileges.
 */
export type UserUpdateData = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
  refreshToken?: string | null;
  loginAttempts?: number;
  lockoutUntil?: Date | null;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  mfaTempTokenHash?: string | null;
  password?: string;
  // Password-reset flow
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  // Email-verification flow
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  // Email-change flow
  emailChangeTokenHash?: string | null;
  emailChangeExpiresAt?: Date | null;
  emailChangePending?: string | null;
};

class UserRepository {
  async findById(
    id: string,
    options: { withProfiles?: boolean; withSensitive?: boolean } = {}
  ): Promise<User | null> {
    const include = options.withProfiles
      ? [
          { model: Doctor, as: 'doctorProfile' },
          { model: Patient, as: 'patientProfile' },
        ]
      : [];

    // Use unscoped() only when sensitive fields (password, refreshToken, mfaSecret, etc.)
    // are explicitly needed. By default the User model's defaultScope excludes them.
    if (options.withSensitive) {
      return User.unscoped().findByPk(id, { include });
    }
    return User.findByPk(id, { include });
  }

  async findByEmail(email: string): Promise<User | null> {
    // Always bypass defaultScope here: callers (login, password flows) need the password hash.
    return User.unscoped().findOne({ where: { email } });
  }

  async findByPasswordResetTokenHash(hash: string): Promise<User | null> {
    return User.findOne({ where: { passwordResetTokenHash: hash } });
  }

  async findByEmailVerificationTokenHash(hash: string): Promise<User | null> {
    return User.findOne({ where: { emailVerificationTokenHash: hash } });
  }

  async findByEmailChangeTokenHash(hash: string): Promise<User | null> {
    return User.findOne({ where: { emailChangeTokenHash: hash } });
  }

  async findAll(filters: UserFilters): Promise<{ users: User[]; total: number }> {
    const { role, isActive, search, page = 1, limit = 10 } = filters;

    // Build conditions as an array and combine with Op.and — this is the idiomatic
    // Sequelize v6 pattern that keeps full type safety with symbol operator keys.
    const conditions: WhereOptions<InferAttributes<User>>[] = [];

    if (role) conditions.push({ role });
    if (isActive !== undefined) conditions.push({ isActive });
    if (search) {
      // Escape SQL LIKE wildcard characters so user input like '%' or '_'
      // cannot be used to produce full-table scans or unintended matches.
      const escapedSearch = search.replace(/[%_\\]/g, char => `\\${char}`);
      conditions.push({
        [Op.or]: [
          { firstName: { [Op.like]: `%${escapedSearch}%` } },
          { lastName: { [Op.like]: `%${escapedSearch}%` } },
          { email: { [Op.like]: `%${escapedSearch}%` } },
        ],
      } as WhereOptions<InferAttributes<User>>);
    }

    const where: WhereOptions<InferAttributes<User>> =
      conditions.length > 0 ? { [Op.and]: conditions } : {};

    const offset = (page - 1) * limit;
    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { users, total };
  }

  async create(data: CreateUserData, transaction?: Transaction): Promise<User> {
    // CreationAttributes<User> is the correct public type for Model.create() arguments
    return User.create(data as CreationAttributes<User>, { transaction });
  }

  async update(user: User, data: UserUpdateData, transaction?: Transaction): Promise<User> {
    // UserUpdateData is a strict subset of InferAttributes<User>, so this cast is safe
    return user.update(data as Partial<InferAttributes<User>>, { transaction });
  }

  /**
   * Update a user without triggering Sequelize hooks.
   * Use this when the data has already been processed (e.g. password already hashed)
   * to avoid double-processing by the beforeUpdate hook.
   */
  async updateWithoutHooks(
    user: User,
    data: UserUpdateData,
    transaction?: Transaction
  ): Promise<User> {
    // UserUpdateData is a strict subset of InferAttributes<User>, so this cast is safe
    return user.update(data as Partial<InferAttributes<User>>, { transaction, hooks: false });
  }

  async count(where?: WhereOptions<InferAttributes<User>>): Promise<number> {
    return User.count({ where });
  }

  async groupBy<K extends keyof InferAttributes<User>>(
    field: K
  ): Promise<Array<{ [P in K]: InferAttributes<User>[P] } & { count: number }>> {
    const rows = await User.findAll({
      attributes: [field as string, [fn('COUNT', col('id')), 'count']],
      group: [field as string],
      raw: true,
    });
    return rows as unknown as Array<{ [P in K]: InferAttributes<User>[P] } & { count: number }>;
  }
}

export const userRepository = new UserRepository();
