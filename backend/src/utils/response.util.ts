import { Response } from 'express';
import { ZodError } from 'zod';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[] | Record<string, string[]>;
    metadata?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export const successResponse = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
): Response => {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
    };
    return res.status(statusCode).json(response);
};

export const createdResponse = <T>(
    res: Response,
    data: T,
    message = 'Resource created successfully'
): Response => {
    return successResponse(res, data, message, 201);
};

export const paginatedResponse = <T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
): Response => {
    const response: ApiResponse<T[]> = {
        success: true,
        data,
        message,
        metadata: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
    return res.status(200).json(response);
};

export const errorResponse = (
    res: Response,
    message: string,
    statusCode = 400,
    errors?: string[] | Record<string, string[]>
): Response => {
    const response: ApiResponse = {
        success: false,
        message,
        errors,
    };
    return res.status(statusCode).json(response);
};

export const notFoundResponse = (
    res: Response,
    resource = 'Resource'
): Response => {
    return errorResponse(res, `${resource} not found`, 404);
};

export const unauthorizedResponse = (
    res: Response,
    message = 'Unauthorized access'
): Response => {
    return errorResponse(res, message, 401);
};

export const forbiddenResponse = (
    res: Response,
    message = 'Access forbidden'
): Response => {
    return errorResponse(res, message, 403);
};

/**
 * Pure formatting function — no Express dependency, easy to unit test.
 * Converts a ZodError into a flat field→messages map.
 */
export const formatZodError = (error: ZodError): Record<string, string[]> => {
    const formattedErrors: Record<string, string[]> = {};
    error.issues.forEach(err => {
        const isWrapper = err.path.length > 0 && ['body', 'query', 'params', 'cookies'].includes(String(err.path[0]));
        const pathAfterRoot = isWrapper ? err.path.slice(1) : err.path;
        
        const field =
            pathAfterRoot.length > 0
                ? pathAfterRoot.join('.')
                : err.path.length > 0
                    ? err.path[0].toString()
                    : err.code || 'unknown';

        if (!formattedErrors[field]) {
            formattedErrors[field] = [];
        }
        formattedErrors[field].push(err.message);
    });

    return formattedErrors;
};

export const validationErrorResponse = (
    res: Response,
    error: ZodError | string[] | Record<string, string[]>,
    message = 'Validation failed'
): Response => {
    const errors = error instanceof ZodError ? formatZodError(error) : error;
    return errorResponse(res, message, 400, errors);
};

export const serverErrorResponse = (
    res: Response,
    message = 'Internal server error'
): Response => {
    return errorResponse(res, message, 500);
};
