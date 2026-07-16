import {
  successResponse,
  createdResponse,
  paginatedResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '../../utils/response.util';

/** Build a minimal mock Express Response. */
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('response.util', () => {

  describe('successResponse', () => {
    it('sends 200 with success=true and data', () => {
      const res = makeRes();
      successResponse(res, { id: 1 }, 'OK');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { id: 1 }, message: 'OK' })
      );
    });

    it('accepts a custom status code', () => {
      const res = makeRes();
      successResponse(res, null, undefined, 204);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('works without an explicit message', () => {
      const res = makeRes();
      successResponse(res, 'payload');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });


  describe('createdResponse', () => {
    it('sends 201 with default message', () => {
      const res = makeRes();
      createdResponse(res, { id: 'new' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { id: 'new' } })
      );
    });

    it('accepts a custom message', () => {
      const res = makeRes();
      createdResponse(res, {}, 'Doctor registered');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Doctor registered' })
      );
    });
  });


  describe('paginatedResponse', () => {
    it('sends 200 with metadata', () => {
      const res = makeRes();
      paginatedResponse(res, [1, 2, 3], 30, 2, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [1, 2, 3],
          metadata: expect.objectContaining({ page: 2, limit: 10, total: 30, totalPages: 3 }),
        })
      );
    });

    it('computes totalPages correctly when total is divisible by limit', () => {
      const res = makeRes();
      paginatedResponse(res, [], 20, 1, 10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ totalPages: 2 }) })
      );
    });

    it('rounds totalPages up when there is a remainder', () => {
      const res = makeRes();
      paginatedResponse(res, [], 21, 1, 10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ totalPages: 3 }) })
      );
    });

    it('passes optional message', () => {
      const res = makeRes();
      paginatedResponse(res, [], 0, 1, 10, 'No results');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'No results' }));
    });
  });


  describe('errorResponse', () => {
    it('sends error with status and success=false', () => {
      const res = makeRes();
      errorResponse(res, 'Bad request', 400);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Bad request' })
      );
    });

    it('defaults to 400 status code', () => {
      const res = makeRes();
      errorResponse(res, 'Error');
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('includes errors object when provided', () => {
      const res = makeRes();
      const errors = { email: ['is required'] };
      errorResponse(res, 'Validation', 422, errors);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors }));
    });
  });


  describe('notFoundResponse', () => {
    it('sends 404 with default resource name', () => {
      const res = makeRes();
      notFoundResponse(res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Resource not found' })
      );
    });

    it('uses custom resource name', () => {
      const res = makeRes();
      notFoundResponse(res, 'User');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User not found' }));
    });
  });


  describe('unauthorizedResponse', () => {
    it('sends 401', () => {
      const res = makeRes();
      unauthorizedResponse(res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('uses custom message', () => {
      const res = makeRes();
      unauthorizedResponse(res, 'Token expired');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token expired' }));
    });
  });


  describe('forbiddenResponse', () => {
    it('sends 403', () => {
      const res = makeRes();
      forbiddenResponse(res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });


  describe('validationErrorResponse', () => {
    it('sends 400 with errors', () => {
      const res = makeRes();
      validationErrorResponse(res, { email: ['is required'] });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: { email: ['is required'] } })
      );
    });

    it('accepts an error string array', () => {
      const res = makeRes();
      validationErrorResponse(res, ['Email is required', 'Name is too short']);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ errors: ['Email is required', 'Name is too short'] })
      );
    });
  });


  describe('serverErrorResponse', () => {
    it('sends 500', () => {
      const res = makeRes();
      serverErrorResponse(res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('uses custom message', () => {
      const res = makeRes();
      serverErrorResponse(res, 'Database unavailable');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Database unavailable' })
      );
    });
  });
});
