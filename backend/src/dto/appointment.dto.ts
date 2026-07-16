import { z } from 'zod';
import { AppointmentStatus } from '../types/constants';
import { trimmedString, trimmedText } from '../utils/zod.util';


export const CreateAppointmentBodySchema = z.strictObject({
  doctorId: z.uuid('Doctor ID must be a valid UUID'),
  appointmentDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Please provide a valid date' })
    .refine(
      val => {
        const [year, month, day] = val.split('-');
        const appointmentDate = new Date(Number(year), Number(month) - 1, Number(day));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appointmentDate >= today;
      },
      { message: 'Appointment date cannot be in the past' }
    )
    .refine(
      val => {
        const [year, month, day] = val.split('-');
        const appointmentDate = new Date(Number(year), Number(month) - 1, Number(day));
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 90);
        return appointmentDate <= maxDate;
      },
      { message: 'Cannot book appointments more than 90 days in advance' }
    ),
  startTime: trimmedString()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: trimmedString()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format')
    .optional(),
  reasonForVisit: trimmedText()
    .min(10, 'Reason for visit must be between 10 and 1000 characters')
    .max(1000, 'Reason for visit must be between 10 and 1000 characters'),
});

export type CreateAppointmentBody = z.infer<typeof CreateAppointmentBodySchema>;

export const UpdateAppointmentBodySchema = z.strictObject({
  appointmentDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Please provide a valid date' })
    .refine(
      val => {
        const [year, month, day] = val.split('-');
        const appointmentDate = new Date(Number(year), Number(month) - 1, Number(day));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appointmentDate >= today;
      },
      { message: 'Appointment date cannot be in the past' }
    )
    .optional(),
  startTime: trimmedString()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format')
    .optional(),
  endTime: trimmedString()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format')
    .optional(),
  reasonForVisit: trimmedText()
    .min(10, 'Reason for visit must be between 10 and 1000 characters')
    .max(1000, 'Reason for visit must be between 10 and 1000 characters')
    .optional(),
  status: z
    .nativeEnum(AppointmentStatus, {
      message: `Status must be one of: ${Object.values(AppointmentStatus).join(', ')}`,
    })
    .optional(),
});

export type UpdateAppointmentBody = z.infer<typeof UpdateAppointmentBodySchema>;

export const CancelAppointmentBodySchema = z.strictObject({
  cancellationReason: trimmedText()
    .min(10, 'Cancellation reason must be between 10 and 500 characters')
    .max(500, 'Cancellation reason must be between 10 and 500 characters'),
});

export type CancelAppointmentBody = z.infer<typeof CancelAppointmentBodySchema>;

export const CompleteAppointmentBodySchema = z.strictObject({
  notes: trimmedText().max(2000, 'Notes must not exceed 2000 characters').optional(),
  prescriptions: z
    .array(
      z.strictObject({
        medication: trimmedString().min(1, 'Medication name is required'),
        dosage: trimmedString().min(1, 'Dosage is required'),
        frequency: trimmedString().min(1, 'Frequency is required'),
        duration: trimmedString().min(1, 'Duration is required'),
        instructions: trimmedText().optional(),
      })
    )
    .optional(),
});

export type CompleteAppointmentBody = z.infer<typeof CompleteAppointmentBodySchema>;

export const GetAppointmentsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be between 1 and 100')
    .max(100, 'Limit must be between 1 and 100')
    .optional(),
  status: z
    .nativeEnum(AppointmentStatus, {
      message: `Status must be one of: ${Object.values(AppointmentStatus).join(', ')}`,
    })
    .optional(),
  startDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Start date must be a valid date' })
    .optional(),
  endDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'End date must be a valid date' })
    .optional(),
  doctorId: z.uuid('Doctor ID must be a valid UUID').optional(),
  patientId: z.uuid('Patient ID must be a valid UUID').optional(),
});

export type GetAppointmentsQuery = z.infer<typeof GetAppointmentsQuerySchema>;

export const AvailableSlotsQuerySchema = z.strictObject({
  doctorId: z.string().uuid('doctorId must be a valid UUID'),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'date must be in YYYY-MM-DD format'
    )
    .refine(val => !isNaN(Date.parse(val)), { message: 'date must be a valid calendar date' }),
});

export type AvailableSlotsQuery = z.infer<typeof AvailableSlotsQuerySchema>;


export const appointmentIdValidation = z.object({
  params: z.strictObject({
    id: z.uuid('Appointment ID must be a valid UUID'),
  }),
});

export const createAppointmentValidation = z.object({ body: CreateAppointmentBodySchema });
export const updateAppointmentValidation = z.object({ body: UpdateAppointmentBodySchema });
export const cancelAppointmentValidation = z.object({ body: CancelAppointmentBodySchema });
export const completeAppointmentValidation = z.object({ body: CompleteAppointmentBodySchema });
export const getAppointmentsValidation = z.object({ query: GetAppointmentsQuerySchema });
export const availableSlotsValidation = z.object({ query: AvailableSlotsQuerySchema });
