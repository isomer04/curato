import { Op, WhereOptions } from 'sequelize';
import { Transaction } from 'sequelize';
import { Doctor, User } from '../models';

export interface DoctorFilters {
  specialization?: string;
  search?: string;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface CreateDoctorData {
  userId: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  bio?: string;
}

class DoctorRepository {
  async findById(id: string, options: { withUser?: boolean } = {}): Promise<Doctor | null> {
    const include = options.withUser
      ? [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
          },
        ]
      : [];

    return Doctor.findByPk(id, { include });
  }

  async findByUserId(userId: string, options: { withUser?: boolean } = {}): Promise<Doctor | null> {
    const include = options.withUser ? [{ model: User, as: 'user' }] : [];
    return Doctor.findOne({ where: { userId }, include });
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Doctor | null> {
    return Doctor.findOne({ where: { licenseNumber } });
  }

  async findAll(filters: DoctorFilters): Promise<{ doctors: Doctor[]; total: number }> {
    const { specialization, search, minRating, page = 1, limit = 10 } = filters;
    const where: WhereOptions<Doctor> = {};
    const userWhere: WhereOptions<User> = { isActive: true };

    if (specialization) {
      where.specialization = { [Op.like]: `%${specialization}%` };
    }

    if (minRating !== undefined) {
      where.rating = { [Op.gte]: minRating };
    }

    if (search) {
      userWhere[Op.or as keyof WhereOptions<User>] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
      ];
    }

    const offset = (page - 1) * limit;
    const { rows: doctors, count: total } = await Doctor.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          where: userWhere,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
        },
      ],
      order: [['rating', 'DESC']],
      limit,
      offset,
    });

    return { doctors, total };
  }

  async findPendingApproval(page = 1, limit = 10): Promise<{ doctors: Doctor[]; total: number }> {
    const offset = (page - 1) * limit;
    const { rows: doctors, count: total } = await Doctor.findAndCountAll({
      where: { isApproved: false },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
        },
      ],
      order: [['createdAt', 'ASC']],
      limit,
      offset,
    });
    return { doctors, total };
  }

  async create(data: CreateDoctorData, transaction?: Transaction): Promise<Doctor> {
    return Doctor.create(data as Doctor['_creationAttributes'], { transaction });
  }

  async update(doctor: Doctor, data: Partial<Doctor>): Promise<Doctor> {
    return doctor.update(data);
  }
}

export const doctorRepository = new DoctorRepository();
