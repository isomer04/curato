import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  sendMessage,
  getConversation,
  getConversationList,
  getUnreadCount,
  markAsRead,
  getUsers,
} from '../controllers/message.controller';

import { createPhiAuditMiddleware, PhiAction, PhiResourceType } from '../middleware/phi-audit.middleware';
import { patientRepository } from '../repositories/patient.repository';
import { AuthenticatedRequest } from '../types/express-augment';
import { UserRole } from '../types/constants';
import { sendMessageValidation, paginationValidation, senderIdParamValidation } from '../dto/message.dto';

const router = Router();

// All messaging routes require authentication
router.use(authMiddleware);

/**
 * Resolve the patient ID for PHI audit.
 * - If the actor is a patient, audit against their own patient record.
 * - If the actor is a doctor/admin, try to find a patient from the other participant.
 */
const resolveMessagePatientId = async (
  req: AuthenticatedRequest,
  otherUserId?: string
): Promise<string | null> => {
  if (req.user.role === UserRole.PATIENT) {
    const patient = await patientRepository.findByUserId(req.user.userId);
    return patient?.id ?? null;
  }
  if (otherUserId) {
    const patient = await patientRepository.findByUserId(otherUserId);
    return patient?.id ?? null;
  }
  return null;
};


router.get(
  '/users',
  validate(paginationValidation),
  getUsers
);


router.get('/unread-count', getUnreadCount);


router.get(
  '/conversations',
  createPhiAuditMiddleware({
    action: PhiAction.VIEW_MESSAGES,
    resourceType: PhiResourceType.MESSAGE,
    resolvePatientId: (req) => resolveMessagePatientId(req),
  }),
  getConversationList
);


router.get(
  '/conversations/:userId',
  validate(paginationValidation),
  createPhiAuditMiddleware({
    action: PhiAction.VIEW_MESSAGES,
    resourceType: PhiResourceType.MESSAGE,
    resolvePatientId: (req) =>
      resolveMessagePatientId(req, req.params['userId']),
  }),
  getConversation
);


router.post(
  '/',
  validate(sendMessageValidation),
  createPhiAuditMiddleware({
    action: PhiAction.SEND_MESSAGE,
    resourceType: PhiResourceType.MESSAGE,
    resolvePatientId: (req) =>
      resolveMessagePatientId(
        req,
        (req.body as { receiverId?: string })?.receiverId
      ),
  }),
  sendMessage
);

// PATCH /messages/read/:senderId - Mark messages from sender as read
router.patch('/read/:senderId', validate(senderIdParamValidation), markAsRead);

export default router;
