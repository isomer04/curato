import { z } from 'zod';
import { UserRole } from '../types/constants';
import { MAX_PASSWORD_LENGTH } from '../config/constants';
import { idParamValidation } from './common.dto';
import { trimmedString, emailString, passwordString } from '../utils/zod.util';


export const AdminUsersQuerySchema = z.strictObject({
  role: z.nativeEnum(UserRole).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
  search: trimmedString().optional(),
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be between 1 and 100')
    .max(100, 'Limit must be between 1 and 100')
    .optional()
    .default(10),
});

export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;

export const AdminUserPatchBodySchema = z
  .strictObject({
    firstName: trimmedString().min(1).max(100).optional(),
    lastName: trimmedString().min(1).max(100).optional(),
    email: emailString().max(255).optional(),
    isActive: z.boolean().optional(),
    role: z.nativeEnum(UserRole).optional(),
  })
  .refine(
    data =>
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      data.email !== undefined ||
      data.isActive !== undefined ||
      data.role !== undefined,
    { message: 'At least one field is required', path: ['_errors'] }
  );

export type AdminUserPatchBody = z.infer<typeof AdminUserPatchBodySchema>;

export const AdminCreateUserBodySchema = z.strictObject({
  firstName: trimmedString().min(1).max(100),
  lastName: trimmedString().min(1).max(100),
  email: emailString().max(255),
  password: passwordString().min(8, 'Password must be at least 8 characters').max(MAX_PASSWORD_LENGTH),
  role: z.nativeEnum(UserRole).optional().default(UserRole.PATIENT),
});

export type AdminCreateUserBody = z.infer<typeof AdminCreateUserBodySchema>;

export const AdminPendingDoctorsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be between 1 and 100')
    .max(100, 'Limit must be between 1 and 100')
    .optional()
    .default(10),
});

export type AdminPendingDoctorsQuery = z.infer<typeof AdminPendingDoctorsQuerySchema>;


export const adminUsersValidation = z.object({ query: AdminUsersQuerySchema });
export const adminUserPatchValidation = z.object({ body: AdminUserPatchBodySchema }).merge(idParamValidation);
export const adminCreateUserValidation = z.object({ body: AdminCreateUserBodySchema });
export const adminPendingDoctorsValidation = z.object({ query: AdminPendingDoctorsQuerySchema });
export const adminUserDeleteValidation = idParamValidation;
