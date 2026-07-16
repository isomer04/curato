import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { validationErrorResponse } from '../utils/response.util';

export const validate = (schema: ZodTypeAny): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = (await schema.parseAsync({
        body: req.body as unknown,
        query: req.query as unknown,
        params: req.params as unknown,
        cookies: req.cookies as unknown,
      })) as Record<string, unknown>;

      if (validatedData && typeof validatedData === 'object') {
        const data = validatedData;
        if ('body' in data) {
          req.body = data['body'];
        }
        // Express 5 exposes req.query as a getter-only that re-parses the URL
        // on every access. Object.assign writes to a throwaway copy. Shadow the
        // prototype getter with an own-property so downstream handlers see the
        // Zod-coerced values (numbers, defaults, etc.).
        if ('query' in data && typeof data['query'] === 'object' && data['query'] !== null) {
          Object.defineProperty(req, 'query', {
            value: data['query'],
            writable: true,
            configurable: true,
          });
        }
        if ('params' in data && typeof data['params'] === 'object' && data['params'] !== null) {
          Object.assign(req.params, data['params']);
        }
        if ('cookies' in data && typeof data['cookies'] === 'object' && data['cookies'] !== null) {
          Object.assign(req.cookies, data['cookies']);
        }
      }

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        validationErrorResponse(res, error);
        return;
      }
      next(error);
    }
  };
};
