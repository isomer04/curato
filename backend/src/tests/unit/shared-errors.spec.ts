import {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../shared/errors';

describe('Shared Error Classes', () => {

  describe('HttpError', () => {
    it('sets message, statusCode and isOperational', () => {
      const err = new HttpError('Something went wrong', 500);
      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(500);
      expect(err.isOperational).toBe(true);
    });

    it('is an instance of Error', () => {
      const err = new HttpError('oops', 400);
      expect(err).toBeInstanceOf(Error);
    });

    it('sets the correct constructor name', () => {
      const err = new HttpError('oops', 400);
      expect(err.name).toBe('HttpError');
    });

    it('includes a captured stack trace', () => {
      const err = new HttpError('oops', 400);
      expect(err.stack).toBeDefined();
    });
  });


  describe('BadRequestError', () => {
    it('defaults to statusCode 400 and a sensible message', () => {
      const err = new BadRequestError();
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Bad request');
    });

    it('accepts a custom message', () => {
      const err = new BadRequestError('Invalid input');
      expect(err.message).toBe('Invalid input');
    });

    it('is an instance of HttpError and Error', () => {
      const err = new BadRequestError();
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toBeInstanceOf(Error);
    });
  });


  describe('UnauthorizedError', () => {
    it('defaults to statusCode 401', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Unauthorized');
    });

    it('accepts a custom message', () => {
      const err = new UnauthorizedError('Token expired');
      expect(err.message).toBe('Token expired');
    });
  });


  describe('ForbiddenError', () => {
    it('defaults to statusCode 403', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Forbidden');
    });
  });


  describe('NotFoundError', () => {
    it('defaults to statusCode 404', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Resource not found');
    });

    it('accepts a custom message', () => {
      const err = new NotFoundError('User not found');
      expect(err.message).toBe('User not found');
    });
  });


  describe('ConflictError', () => {
    it('defaults to statusCode 409', () => {
      const err = new ConflictError();
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Resource conflict');
    });

    it('accepts a custom message', () => {
      const err = new ConflictError('Email already registered');
      expect(err.message).toBe('Email already registered');
    });
  });


  describe('ValidationError', () => {
    it('has statusCode 422', () => {
      const err = new ValidationError('Validation failed', { email: ['is required'] });
      expect(err.statusCode).toBe(422);
    });

    it('stores the errors object', () => {
      const errors = { email: ['is required'], name: ['is too short'] };
      const err = new ValidationError('Validation failed', errors);
      expect(err.errors).toEqual(errors);
    });

    it('uses the provided message', () => {
      const err = new ValidationError('Custom validation message', {});
      expect(err.message).toBe('Custom validation message');
    });
  });


  describe('instanceof checks', () => {
    it('each error class is an instance of HttpError', () => {
      expect(new BadRequestError()).toBeInstanceOf(HttpError);
      expect(new UnauthorizedError()).toBeInstanceOf(HttpError);
      expect(new ForbiddenError()).toBeInstanceOf(HttpError);
      expect(new NotFoundError()).toBeInstanceOf(HttpError);
      expect(new ConflictError()).toBeInstanceOf(HttpError);
      expect(new ValidationError('msg', {})).toBeInstanceOf(HttpError);
    });

    it('each error class is an instance of Error', () => {
      expect(new BadRequestError()).toBeInstanceOf(Error);
      expect(new UnauthorizedError()).toBeInstanceOf(Error);
      expect(new ForbiddenError()).toBeInstanceOf(Error);
      expect(new NotFoundError()).toBeInstanceOf(Error);
      expect(new ConflictError()).toBeInstanceOf(Error);
      expect(new ValidationError('msg', {})).toBeInstanceOf(Error);
    });
  });
});
