import { Router } from 'express';
import * as appointmentController from '../controllers/appointment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { requirePatient, requireDoctorOrAdmin } from '../middleware/role.middleware';
import { createPhiAuditMiddleware, PhiAction, PhiResourceType } from '../middleware/phi-audit.middleware';
import { appointmentRepository, patientRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/express-augment';
import {
  createAppointmentValidation,
  updateAppointmentValidation,
  cancelAppointmentValidation,
  completeAppointmentValidation,
  getAppointmentsValidation,
  availableSlotsValidation,
} from '../dto/appointment.dto';


const router = Router();

// All routes require authentication
router.use(authMiddleware);

// PHI patient-ID resolvers

/**
 * Used on POST / (book appointment) — the patient IS the authenticated user.
 */
const resolvePatientIdFromUser = async (req: AuthenticatedRequest): Promise<string | null> => {
    const patient = await patientRepository.findByUserId(req.user.userId);
    return patient?.id ?? null;
};

/**
 * Used on all /:id routes — look up the appointment and return its patientId.
 * Keeps PHI resolution lightweight (single indexed PK lookup).
 */
const resolvePatientIdFromAppointment = async (req: AuthenticatedRequest): Promise<string | null> => {
    const appointment = await appointmentRepository.findById(req.params['id']);
    return appointment?.patientId ?? null;
};

// Routes

/**
 * @route   GET /api/v1/appointments
 * @desc    Get all appointments (filtered by role)
 * @access  Private
 */
router.get(
    '/',
    validate(getAppointmentsValidation),
    appointmentController.getAppointments
);

/**
 * @route   GET /api/v1/appointments/available-slots
 * @desc    Get available appointment slots for a doctor
 * @access  Private
 */
router.get(
    '/available-slots',
    validate(availableSlotsValidation),
    appointmentController.getAvailableSlots
);

/**
 * @route   GET /api/v1/appointments/dashboard-stats
 * @desc    Get pre-aggregated appointment status counts for the patient dashboard
 * @access  Private (Patient)
 */
router.get('/dashboard-stats', requirePatient, appointmentController.getDashboardStats);

/**
 * @route   GET /api/v1/appointments/:id
 * @desc    Get appointment by ID — PHI read access
 * @access  Private
 */
router.get(
    '/:id',
    createPhiAuditMiddleware({
        action: PhiAction.VIEW_APPOINTMENT,
        resourceType: PhiResourceType.APPOINTMENT,
        resolvePatientId: resolvePatientIdFromAppointment,
    }),
    appointmentController.getAppointmentById
);

/**
 * @route   POST /api/v1/appointments
 * @desc    Create a new appointment (patients only) — PHI creation
 * @access  Private (Patient)
 */
router.post(
    '/',
    requirePatient,
    validate(createAppointmentValidation),
    createPhiAuditMiddleware({
        action: PhiAction.BOOK_APPOINTMENT,
        resourceType: PhiResourceType.APPOINTMENT,
        resolvePatientId: resolvePatientIdFromUser,
    }),
    appointmentController.createAppointment
);

/**
 * @route   PUT /api/v1/appointments/:id
 * @desc    Update an appointment — PHI modification
 * @access  Private
 */
router.put(
    '/:id',
    validate(updateAppointmentValidation),
    createPhiAuditMiddleware({
        action: PhiAction.UPDATE_APPOINTMENT,
        resourceType: PhiResourceType.APPOINTMENT,
        resolvePatientId: resolvePatientIdFromAppointment,
    }),
    appointmentController.updateAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/cancel
 * @desc    Cancel an appointment — PHI modification
 * @access  Private
 */
router.post(
    '/:id/cancel',
    validate(cancelAppointmentValidation),
    createPhiAuditMiddleware({
        action: PhiAction.CANCEL_APPOINTMENT,
        resourceType: PhiResourceType.APPOINTMENT,
        resolvePatientId: resolvePatientIdFromAppointment,
    }),
    appointmentController.cancelAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/confirm
 * @desc    Confirm an appointment (doctors only) — PHI access
 * @access  Private (Doctor)
 */
router.post(
    '/:id/confirm',
    requireDoctorOrAdmin,
    createPhiAuditMiddleware({
        action: PhiAction.CONFIRM_APPOINTMENT,
        resourceType: PhiResourceType.APPOINTMENT,
        resolvePatientId: resolvePatientIdFromAppointment,
    }),
    appointmentController.confirmAppointment
);

/**
 * @route   POST /api/v1/appointments/:id/complete
 * @desc    Complete an appointment (doctors only) — PHI modification
 * @access  Private (Doctor)
 */
router.post(
    '/:id/complete',
    requireDoctorOrAdmin,
    validate(completeAppointmentValidation),
    createPhiAuditMiddleware({
        action: PhiAction.COMPLETE_APPOINTMENT,
        resourceType: PhiResourceType.APPOINTMENT,
        resolvePatientId: resolvePatientIdFromAppointment,
    }),
    appointmentController.completeAppointment
);

export default router;
