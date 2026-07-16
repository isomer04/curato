import { Request, Response, NextFunction } from 'express';
import { sanitizeMiddleware } from '../../middleware/sanitize.middleware';

const mockResponse = (): Response => ({}) as Response;

describe('sanitizeMiddleware', () => {
  let next: NextFunction;
  beforeEach(() => {
    next = jest.fn();
  });

  it('strips null bytes from string values in body', () => {
    const req = {
      body: { name: 'John\0Doe', email: 'test@example.com' },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.name).toBe('JohnDoe');
    expect(next).toHaveBeenCalled();
  });

  it('strips control characters except tab, newline, carriage return', () => {
    const req = {
      body: { notes: 'Line1\nLine2\t\x01Hidden\x7F' },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.notes).toBe('Line1\nLine2\tHidden');
  });

  it('trims whitespace from string values', () => {
    const req = {
      body: { name: '  John  ' },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.name).toBe('John');
  });

  it('does NOT sanitize password fields', () => {
    const rawPassword = '  P@ss\0w0rd!  ';
    const req = {
      body: { password: rawPassword, confirmPassword: rawPassword },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.password).toBe(rawPassword);
    expect(req.body.confirmPassword).toBe(rawPassword);
  });

  it('does NOT sanitize token fields', () => {
    const rawToken = '  abc\0def  ';
    const req = {
      body: { token: rawToken, tempToken: rawToken, refreshToken: rawToken },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.token).toBe(rawToken);
    expect(req.body.tempToken).toBe(rawToken);
    expect(req.body.refreshToken).toBe(rawToken);
  });

  it('sanitizes nested objects recursively', () => {
    const req = {
      body: { address: { street: '123\0 Main St', city: '  NYC  ' } },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.address.street).toBe('123 Main St');
    expect(req.body.address.city).toBe('NYC');
  });

  it('sanitizes arrays', () => {
    const req = {
      body: { allergies: ['  Peanuts  ', 'Dust\0'] },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.allergies).toEqual(['Peanuts', 'Dust']);
  });

  it('sanitizes query parameters', () => {
    const req = {
      body: {},
      query: { search: '  test\0  ' },
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.query['search']).toBe('test');
  });

  it('sanitizes URL params', () => {
    const req = {
      body: {},
      query: {},
      params: { id: '  abc\0  ' },
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.params['id']).toBe('abc');
  });

  it('passes non-string values through unchanged', () => {
    const req = {
      body: { age: 30, active: true, data: null },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    expect(req.body.age).toBe(30);
    expect(req.body.active).toBe(true);
    expect(req.body.data).toBeNull();
  });

  it('preserves medical text with special characters (no HTML encoding)', () => {
    const req = {
      body: { notes: "O'Brien < 5 mg & 200 units" },
      query: {},
      params: {},
    } as unknown as Request;

    sanitizeMiddleware(req, mockResponse(), next);

    // Should NOT be HTML-encoded — just trimmed and null-byte-cleaned
    expect(req.body.notes).toBe("O'Brien < 5 mg & 200 units");
  });
});
