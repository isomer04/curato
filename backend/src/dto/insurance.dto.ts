import { z } from 'zod';
import { InsuranceStatus } from '../types/constants';
import { trimmedString, trimmedText } from '../utils/zod.util';

const dateString = trimmedString().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');


/** POST /api/v1/insurance */
export const CreateInsuranceBodySchema = z
  .strictObject({
    providerName: trimmedString()
      .min(1, 'Provider name is required')
      .max(255, 'Provider name must not exceed 255 characters'),
    policyNumber: trimmedString()
      .min(1, 'Policy number is required')
      .max(100, 'Policy number must not exceed 100 characters'),
    groupNumber: trimmedString().max(100).optional(),
    subscriberName: trimmedString().min(1, 'Subscriber name is required').max(255),
    subscriberRelation: trimmedString().max(50).optional(),
    planType: trimmedString().max(100).optional(),
    coverageStartDate: dateString,
    coverageEndDate: dateString.optional(),
    copayAmount: z.coerce.number().nonnegative('copayAmount must be non-negative').optional(),
    deductibleAmount: z.coerce
      .number()
      .nonnegative('deductibleAmount must be non-negative')
      .optional(),
  })
  .refine(data => !data.coverageEndDate || data.coverageEndDate >= data.coverageStartDate, {
    message: 'coverageEndDate must be on or after coverageStartDate',
    path: ['coverageEndDate'],
  });

export type CreateInsuranceBody = z.infer<typeof CreateInsuranceBodySchema>;

/** PUT /api/v1/insurance/:id */
export const UpdateInsuranceBodySchema = z
  .strictObject({
    providerName: trimmedString().min(1).max(255).optional(),
    policyNumber: trimmedString().min(1).max(100).optional(),
    groupNumber: trimmedString().max(100).optional(),
    subscriberName: trimmedString().min(1).max(255).optional(),
    subscriberRelation: trimmedString().max(50).optional(),
    planType: trimmedString().max(100).optional(),
    coverageStartDate: dateString.optional(),
    coverageEndDate: dateString.optional(),
    copayAmount: z.coerce.number().nonnegative().optional(),
    deductibleAmount: z.coerce.number().nonnegative().optional(),
  })
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'At least one field is required for update',
  })
  .refine(
    data => {
      if (data.coverageStartDate && data.coverageEndDate) {
        return data.coverageEndDate >= data.coverageStartDate;
      }
      return true;
    },
    {
      message: 'coverageEndDate must be on or after coverageStartDate',
      path: ['coverageEndDate'],
    }
  );

export type UpdateInsuranceBody = z.infer<typeof UpdateInsuranceBodySchema>;

/** POST /api/v1/insurance/:id/verify */
export const VerifyInsuranceBodySchema = z.strictObject({
  status: z.nativeEnum(InsuranceStatus, {
    message: 'status must be a valid InsuranceStatus',
  }),
  notes: trimmedText().max(1000).optional(),
});

export type VerifyInsuranceBody = z.infer<typeof VerifyInsuranceBodySchema>;


export const createInsuranceValidation = z.object({ body: CreateInsuranceBodySchema });
export const updateInsuranceValidation = z.object({ body: UpdateInsuranceBodySchema });
export const verifyInsuranceValidation = z.object({ body: VerifyInsuranceBodySchema });
