import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import {
  adminUsersValidation,
  adminUserPatchValidation,
  adminCreateUserValidation,
  adminPendingDoctorsValidation,
  adminUserDeleteValidation,
} from '../dto/admin.dto';


const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get system-level stats for users and appointments
 * @access  Private (Admin)
 */
router.get('/stats', adminController.getStats);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get paginated users with optional filters
 * @access  Private (Admin)
 */
router.get(
  '/users',
  validate(adminUsersValidation),
  adminController.getUsers
);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create a new user
 * @access  Private (Admin)
 */
router.post(
  '/users',
  validate(adminCreateUserValidation),
  adminController.createUser
);

/**
 * @route   PATCH /api/v1/admin/users/:id
 * @desc    Update user active status and/or role
 * @access  Private (Admin)
 */
router.patch(
  '/users/:id',
  validate(adminUserPatchValidation),
  adminController.updateUser
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Permanently delete a user
 * @access  Private (Admin)
 */
router.delete('/users/:id', validate(adminUserDeleteValidation), adminController.deleteUser);

/**
 * @route   GET /api/v1/admin/doctors/pending
 * @desc    Get doctors awaiting approval
 * @access  Private (Admin)
 */
router.get(
  '/doctors/pending',
  validate(adminPendingDoctorsValidation),
  adminController.getPendingDoctors
);

/**
 * @route   PATCH /api/v1/admin/doctors/:id/approve
 * @desc    Approve a pending doctor registration
 * @access  Private (Admin)
 */
router.patch('/doctors/:id/approve', adminController.approveDoctor);

/**
 * @route   PATCH /api/v1/admin/doctors/:id/reject
 * @desc    Reject a pending doctor registration
 * @access  Private (Admin)
 */
router.patch('/doctors/:id/reject', adminController.rejectDoctor);

export default router;
