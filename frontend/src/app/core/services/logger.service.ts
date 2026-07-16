import { Injectable, isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  log(message: unknown, ...optionalParams: unknown[]) {
    if (isDevMode()) {
      console.log(message, ...optionalParams);
    }
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    // Errors are always logged — suppressing them in production hides real bugs.
    // In a production-grade app, pipe these to a crash-reporting service
    // (e.g. Sentry, Datadog) instead of only console.error.
    console.error(message, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    // Warnings are always logged — they often indicate degraded behavior.
    console.warn(message, ...optionalParams);
  }

  info(message: unknown, ...optionalParams: unknown[]) {
    if (isDevMode()) {
      console.info(message, ...optionalParams);
    }
  }
}
