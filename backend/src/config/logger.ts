import winston from 'winston';
import path from 'path';
import { type Request, type Response } from 'express';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${String(timestamp)} [${level}]: ${String(stack ?? message)}`;
});

const logDir = path.join(__dirname, '../../logs');

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  defaultMeta: { service: 'healthcare-api' },
  transports: [
    // HIPAA §164.312(b): audit logs must be retained for 6 years.
    // maxFiles is intentionally omitted — delegate archival to the
    // deployment environment (logrotate, CloudWatch, ELK, etc.).
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5 MB
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5 MB
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
    }),
  ],
});

// Add console transport for non-production environments
if (process.env['NODE_ENV'] !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

// Logs method, URL, status code, response time, and content length.
// In production only errors (4xx/5xx) are logged to reduce noise.
export const httpLogger = (req: Request, res: Response, next: () => void): void => {
  const start = Date.now();
  const isProduction = process.env['NODE_ENV'] === 'production';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // In production, skip successful requests
    if (isProduction && status < 400) {
      return;
    }

    const contentLength = res.getHeader('content-length') ?? '-';
    const message = `${req.method} ${req.originalUrl} ${status} ${duration}ms - ${String(contentLength)}`;

    if (status >= 500) {
      logger.error(message);
    } else if (status >= 400) {
      logger.warn(message);
    } else {
      logger.http(message);
    }
  });

  next();
};
