import { UserRole, AppointmentStatus } from '../types/constants';
import { userRepository } from '../repositories/user.repository';
import { appointmentRepository } from '../repositories/appointment.repository';
import { doctorRepository } from '../repositories/doctor.repository';
import { userService } from './user.service';
import { NotFoundError, ConflictError, BadRequestError } from '../shared/errors';
import { isCommonPassword } from '../utils/password.util';
import { logger } from '../config/logger';
import { sequelize } from '../config/database';
import { Doctor, User } from '../models';

interface AdminUserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface AdminUserUpdateData {
  isActive?: boolean;
  role?: UserRole;
}

export interface AdminStats {
  users: {
    total: number;
    byRole: Record<UserRole, number>;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
  };
  appointments: {
    total: number;
    byStatus: Record<AppointmentStatus, number>;
  };
}

class AdminService {
  async getStats(): Promise<AdminStats> {
    const byRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.DOCTOR]: 0,
      [UserRole.PATIENT]: 0,
    };

    const [totalUsers, activeUsers, verifiedUsers, usersByRoleRaw] = await Promise.all([
      userRepository.count(),
      userRepository.count({ isActive: true }),
      userRepository.count({ isEmailVerified: true }),
      userRepository.groupBy('role'),
    ]);

    for (const row of usersByRoleRaw) {
      byRole[row.role] = Number(row.count);
    }

    const byStatus: Record<AppointmentStatus, number> = {
      [AppointmentStatus.SCHEDULED]: 0,
      [AppointmentStatus.CONFIRMED]: 0,
      [AppointmentStatus.COMPLETED]: 0,
      [AppointmentStatus.CANCELLED]: 0,
      [AppointmentStatus.NO_SHOW]: 0,
    };

    const [totalAppointments, appointmentsByStatusRaw] = await Promise.all([
      appointmentRepository.count(),
      appointmentRepository.groupByStatus(),
    ]);

    for (const row of appointmentsByStatusRaw) {
      byStatus[row.status as AppointmentStatus] = Number(row.count);
    }

    return {
      users: {
        total: totalUsers,
        byRole,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
      },
      appointments: {
        total: totalAppointments,
        byStatus,
      },
    };
  }

  async getUsers(filters: AdminUserFilters): Promise<{ users: User[]; total: number }> {
    return userRepository.findAll(filters);
  }

  async updateUser(userId: string, data: AdminUserUpdateData): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    await sequelize.transaction(async t => {
      if (data.role !== undefined) {
        await userRepository.update(user, { role: data.role }, t);
      }

      if (data.isActive !== undefined) {
        if (data.isActive) {
          await userService.activateUser(userId, t);
        } else {
          await userService.deactivateUser(userId, t);
        }
      }
    });
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ConflictError('A user with this email already exists');

    if (isCommonPassword(data.password)) {
      throw new BadRequestError(
        'This password is too common. Please choose a more unique password.'
      );
    }

    return userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      role: data.role ?? UserRole.PATIENT,
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    await user.destroy();
  }

  async getPendingDoctors(page = 1, limit = 10): Promise<{ doctors: Doctor[]; total: number }> {
    return doctorRepository.findPendingApproval(page, limit);
  }

  async approveDoctor(doctorId: string): Promise<void> {
    const doctor = await doctorRepository.findById(doctorId, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor not found');
    if (doctor.isApproved) throw new BadRequestError('Doctor is already approved');

    await doctorRepository.update(doctor, { isApproved: true } as Partial<typeof doctor>);
    logger.info('Doctor approved', { doctorId, userId: doctor.userId });
  }

  async rejectDoctor(doctorId: string): Promise<void> {
    const doctor = await doctorRepository.findById(doctorId, { withUser: true });
    if (!doctor) throw new NotFoundError('Doctor not found');
    if (doctor.isApproved) throw new BadRequestError('Cannot reject an already-approved doctor');

    // Deactivate the user account — they can re-apply later
    const user = await userRepository.findById(doctor.userId);
    if (user) {
      await userRepository.update(user, { isActive: false });
    }
    logger.info('Doctor registration rejected', { doctorId, userId: doctor.userId });
  }
}

export const adminService = new AdminService();
