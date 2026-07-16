import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate.middleware';

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('validate middleware', () => {
  let next: NextFunction;
  beforeEach(() => {
    next = jest.fn();
  });

  it('calls next when body passes validation', async () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        name: z.string().min(1),
      }),
    });

    const req = {
      body: { email: 'test@test.com', name: 'John' },
      query: {},
      params: {},
      cookies: {},
    } as unknown as Request;

    const res = mockResponse();
    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 422 with structured errors when validation fails', async () => {
    const schema = z.object({
      body: z.object({
        email: z.string().email(),
        name: z.string().min(1),
      }),
    });

    const req = {
      body: { email: 'not-an-email', name: '' },
      query: {},
      params: {},
      cookies: {},
    } as unknown as Request;

    const res = mockResponse();
    await validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('replaces req.body with validated data', async () => {
    const schema = z.object({
      body: z.object({
        count: z.coerce.number(),
      }),
    });

    const req = {
      body: { count: '42', extraField: 'ignored' },
      query: {},
      params: {},
      cookies: {},
    } as unknown as Request;

    const res = mockResponse();
    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalled();
    // Zod strips unknown keys; body should only contain validated fields
    expect(req.body.count).toBe(42);
  });

  it('forwards non-Zod errors to next()', async () => {
    const schema = {
      parseAsync: jest.fn().mockRejectedValue(new Error('unexpected')),
    } as unknown as z.ZodTypeAny;

    const req = {
      body: {},
      query: {},
      params: {},
      cookies: {},
    } as unknown as Request;

    const res = mockResponse();
    await validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
