import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { requireDoctor } from '../middleware/role.middleware';
import { getDoctorsValidation } from '../dto/user.dto';
import {
  createAvailabilityValidation,
  updateAvailabilityValidation,
  weeklyScheduleValidation,
} from '../dto/availability.dto';
import { doctorProfileValidation } from '../dto/auth.dto';

const router = Router();

/**
 * @route   GET /api/v1/doctors
 * @desc    Get paginated list of approved doctors
 * @access  Public
 */
router.get(
  '/',
  optionalAuthMiddleware,
  validate(getDoctorsValidation),
  doctorController.getDoctors
);

/**
 * @route   GET /api/v1/doctors/availability
 * @desc    Get logged-in doctor's availability schedule
 * @access  Private (Doctor)
 */
router.get('/availability', authMiddleware, requireDoctor, doctorController.getMyAvailability);

/**
 * @route   GET /api/v1/doctors/patients
 * @desc    Get the list of distinct patients who have had appointments with the logged-in doctor
 * @access  Private (Doctor)
 */
router.get(
  '/patients',
  authMiddleware,
  requireDoctor,
  validate(getDoctorsValidation),
  doctorController.getDoctorPatients
);

/**
 * @route   GET /api/v1/doctors/:id
 * @desc    Get doctor by ID
 * @access  Public
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  doctorController.getDoctorById
);

/**
 * @route   GET /api/v1/doctors/:id/availability
 * @desc    Get doctor's availability schedule
 * @access  Public
 */
router.get('/:id/availability', doctorController.getDoctorAvailability);

// Protected routes (require authentication)
router.use(authMiddleware);

/**
 * @route   PUT /api/v1/doctors/profile
 * @desc    Update doctor profile
 * @access  Private (Doctor)
 */
router.put(
  '/profile',
  requireDoctor,
  validate(doctorProfileValidation),
  doctorController.updateDoctorProfile
);

/**
 * @route   POST /api/v1/doctors/availability
 * @desc    Create availability slot
 * @access  Private (Doctor)
 */
router.post(
  '/availability',
  requireDoctor,
  validate(createAvailabilityValidation),
  doctorController.createAvailability
);

/**
 * @route   PUT /api/v1/doctors/availability/:id
 * @desc    Update availability slot
 * @access  Private (Doctor)
 */
router.put(
  '/availability/:id',
  requireDoctor,
  validate(updateAvailabilityValidation),
  doctorController.updateAvailability
);

/**
 * @route   DELETE /api/v1/doctors/availability/:id
 * @desc    Delete availability slot
 * @access  Private (Doctor)
 */
router.delete(
  '/availability/:id',
  requireDoctor,
  doctorController.deleteAvailability
);

/**
 * @route   POST /api/v1/doctors/schedule
 * @desc    Set weekly schedule
 * @access  Private (Doctor)
 */
router.post(
  '/schedule',
  requireDoctor,
  validate(weeklyScheduleValidation),
  doctorController.setWeeklySchedule
);

export default router;
