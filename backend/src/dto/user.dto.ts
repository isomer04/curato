import { z } from 'zod';
import { trimmedString } from '../utils/zod.util';


export const GetDoctorsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be between 1 and 100')
    .max(100, 'Limit must be between 1 and 100')
    .optional(),
  specialization: trimmedString()
    .min(1, 'Specialization must be between 1 and 100 characters')
    .max(100, 'Specialization must be between 1 and 100 characters')
    .optional(),
  search: trimmedString()
    .min(1, 'Search term must be between 1 and 100 characters')
    .max(100, 'Search term must be between 1 and 100 characters')
    .optional(),
  minRating: z.coerce
    .number()
    .min(0, 'Minimum rating must be between 0 and 5')
    .max(5, 'Minimum rating must be between 0 and 5')
    .optional(),
});

export type GetDoctorsQuery = z.infer<typeof GetDoctorsQuerySchema>;


export const userIdValidation = z.object({
  params: z.strictObject({
    id: z.uuid('User ID must be a valid UUID'),
  }),
});

export const getDoctorsValidation = z.object({ query: GetDoctorsQuerySchema });
