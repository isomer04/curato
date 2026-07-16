import { z } from 'zod';


/** GET /api/v1/medical-records/my-records */
export const GetRecordsQuerySchema = z.strictObject({
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be a positive integer')
    .optional()
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be between 1 and 100')
    .max(100, 'Limit must be between 1 and 100')
    .optional()
    .default(10),
});

export type GetRecordsQuery = z.infer<typeof GetRecordsQuerySchema>;


export const getRecordsValidation = z.object({ query: GetRecordsQuerySchema });

