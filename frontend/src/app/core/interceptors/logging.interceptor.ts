import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, finalize } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const started = Date.now();
  let status: string = 'failed';

  return next(req).pipe(
    tap({
      next: () => {
        status = 'succeeded';
      },
      error: () => {
        status = 'failed';
      }
    }),
    finalize(() => {
      const elapsed = Date.now() - started;
      const msg = `${req.method} "${req.urlWithParams}" ${status} in ${elapsed} ms.`;
      logger.info(msg);
    })
  );
};
