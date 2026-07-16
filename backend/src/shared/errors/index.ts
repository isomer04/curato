/**
 * Domain-level error classes.
 *
 * These live in the shared layer so that services and repositories can import
 * them without depending on any HTTP / middleware concerns. The error middleware
 * in the infrastructure layer reads these types and maps them to HTTP responses.
 */

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

export class ValidationError extends HttpError {
  errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>) {
    super(message, 422);
    this.errors = errors;
  }
}

/** Type predicate: narrows `unknown` to `AppError` at runtime.
 * Uses `instanceof HttpError` so that third-party errors with incidental
 * `statusCode` properties (e.g. from axios/got) do not pass this check.
 */
export function isAppError(err: unknown): err is AppError {
  return err instanceof HttpError;
}

/** Type predicate: narrows `unknown` to `HttpError` at runtime. */
export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
