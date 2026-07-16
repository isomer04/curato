/**
 * Shared / reusable Zod validation schemas used across multiple routes.
 */
import { z } from 'zod';

/**
 * Validates that a route `:id` parameter is a well-formed UUID v4.
 * Attach this to any route that reads an ID from `req.params.id` to
 * return a clean 400 response instead of a cryptic database-layer error.
 *
 * @example
 * router.get('/:id', validate(idParamValidation), myController.getById);
 */
export const idParamValidation = z.object({
  params: z.strictObject({
    id: z.uuid('ID must be a valid UUID'),
  }),
});

/**
 * Validates that a route `:patientId` parameter is a well-formed UUID v4.
 * Used on routes that address a patient by their user ID in the URL.
 */
export const patientIdParamValidation = z.object({
  params: z.strictObject({
    patientId: z.uuid('Patient ID must be a valid UUID'),
  }),
});
