import { Router } from 'express';
import * as medicalRecordController from '../controllers/medical-record.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { requirePatient } from '../middleware/role.middleware';

import {
  createPhiAuditMiddleware,
  PhiAction,
  PhiResourceType,
} from '../middleware/phi-audit.middleware';
import { patientRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/express-augment';
import { getRecordsValidation } from '../dto/medical-record.dto';

const router = Router();

router.use(authMiddleware);

/**
 * Resolves the patient UUID from the authenticated user's ID.
 * Used by PHI audit middleware to attach the correct patientId to each log entry.
 */
const resolvePatientIdFromUser = async (req: AuthenticatedRequest): Promise<string | null> => {
  const patient = await patientRepository.findByUserId(req.user.userId);
  return patient?.id ?? null;
};

/**
 * @route   GET /api/v1/medical-records/my-records
 * @desc    Get current patient's medical records
 * @access  Private (Patient)
 */
router.get(
  '/my-records',
  requirePatient,
  validate(getRecordsValidation),
  createPhiAuditMiddleware({
    action: PhiAction.VIEW_MEDICAL_RECORDS,
    resourceType: PhiResourceType.MEDICAL_RECORD,
    resolvePatientId: resolvePatientIdFromUser,
  }),
  medicalRecordController.getMyRecords
);

/**
 * @route   GET /api/v1/medical-records/export/csv
 * @desc    Export current patient's medical records as CSV
 * @access  Private (Patient)
 */
router.get(
  '/export/csv',
  requirePatient,
  createPhiAuditMiddleware({
    action: PhiAction.EXPORT_RECORDS_CSV,
    resourceType: PhiResourceType.MEDICAL_RECORD,
    resolvePatientId: resolvePatientIdFromUser,
  }),
  medicalRecordController.exportMyRecordsCsv
);

/**
 * @route   GET /api/v1/medical-records/export/pdf
 * @desc    Export current patient's medical records as PDF
 * @access  Private (Patient)
 */
router.get(
  '/export/pdf',
  requirePatient,
  createPhiAuditMiddleware({
    action: PhiAction.EXPORT_RECORDS_PDF,
    resourceType: PhiResourceType.MEDICAL_RECORD,
    resolvePatientId: resolvePatientIdFromUser,
  }),
  medicalRecordController.exportMyRecordsPdf
);

export default router;
