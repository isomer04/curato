export { authMiddleware, optionalAuthMiddleware } from './auth.middleware';
export {
    requireRole,
    requireAdmin,
    requireDoctor,
    requirePatient,
    requireDoctorOrAdmin,
    requirePatientOrAdmin,
    requireAuthenticated,
} from './role.middleware';
export { validate } from './validate.middleware';
export {
    errorMiddleware,
    asyncHandler,
    notFoundHandler,
    HttpError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError,
} from './error.middleware';
export {
    rateLimitMiddleware,
    loginRateLimitMiddleware,
    passwordResetRateLimitMiddleware,
    registrationRateLimitMiddleware,
} from './rateLimit.middleware';
export { sanitizeMiddleware, removeUnsafeFields } from './sanitize.middleware';
export { createPhiAuditMiddleware, PhiAction, PhiResourceType } from './phi-audit.middleware';
export type { PhiAuditMiddlewareOptions } from './phi-audit.middleware';
