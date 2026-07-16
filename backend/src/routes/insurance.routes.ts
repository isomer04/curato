import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  requirePatient,
  requireDoctorOrAdmin,
  requireAuthenticated,
} from '../middleware/role.middleware';

import {
  createInsurance,
  getMyInsurance,
  getInsuranceById,
  updateInsurance,
  verifyInsurance,
  deactivateInsurance,
  deleteInsurance,
  getActiveInsurance,
  getPatientInsurance,
} from '../controllers/insurance.controller';
import {
  createPhiAuditMiddleware,
  PhiAction,
  PhiResourceType,
} from '../middleware/phi-audit.middleware';
import { insuranceRepository } from '../repositories/insurance.repository';
import { patientRepository } from '../repositories/patient.repository';
import { UserRole } from '../types/constants';
import {
  createInsuranceValidation,
  updateInsuranceValidation,
  verifyInsuranceValidation,
} from '../dto/insurance.dto';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Patient routes
router.post('/', requirePatient, validate(createInsuranceValidation), createInsurance);
router.get('/', requirePatient, getMyInsurance);
router.get('/active', requirePatient, getActiveInsurance);
router.get(
  '/:id',
  requireAuthenticated,
  createPhiAuditMiddleware({
    action: PhiAction.VIEW_INSURANCE,
    resourceType: PhiResourceType.INSURANCE,
    resolvePatientId: async req => {
      if (req.user?.role === UserRole.PATIENT) {
        const patient = await patientRepository.findByUserId(req.user.userId);
        return patient?.id ?? null;
      }
      // Doctor/Admin — resolve patient from the insurance record itself
      const insurance = await insuranceRepository.findById(req.params['id']);
      return insurance?.patientId ?? null;
    },
  }),
  getInsuranceById
);
router.put('/:id', requirePatient, validate(updateInsuranceValidation), updateInsurance);
router.post('/:id/deactivate', requirePatient, deactivateInsurance);
router.delete('/:id', requirePatient, deleteInsurance);

// Admin/Doctor routes
router.post(
  '/:id/verify',
  requireDoctorOrAdmin,
  validate(verifyInsuranceValidation),
  verifyInsurance
);
router.get(
  '/patient/:patientId',
  requireDoctorOrAdmin,
  getPatientInsurance
);

export default router;
