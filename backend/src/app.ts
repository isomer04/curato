import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import routes from './routes';
import { env, isProduction } from './config/env';
import { httpLogger } from './config/logger';
import {
    errorMiddleware,
    notFoundHandler,
    rateLimitMiddleware,
} from './middleware';
import { initializeAssociations } from './models';
import { initNotificationSubscribers } from './subscribers/notification.subscriber';

/**
 * Call this once from server.ts (or your integration test setup) BEFORE
 * starting the HTTP listener. Keeping side-effecting initialisation out
 * of module top-level makes app.ts safe to import in tests without
 * unintentionally registering event listeners or Sequelize associations.
 */
export function initializeApp(): void {
  initializeAssociations();
  initNotificationSubscribers();
}

const app: Application = express();

// Tell Express to trust the first hop of X-Forwarded-For so that req.ip
// returns the real client IP when running behind a reverse proxy (Nginx,
// AWS ALB, etc.).  Without this, spoofed X-Forwarded-For headers bypass
// IP-based rate limiting and corrupt PHI audit log IP addresses.
app.set('trust proxy', 1);

// Sets various HTTP security headers to protect against common attacks.
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        crossOriginEmbedderPolicy: isProduction(),
        crossOriginOpenerPolicy: isProduction() ? { policy: 'same-origin' } : false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
);

// Compresses response bodies (gzip / deflate) for all requests.
// Skips compression for responses smaller than 1 KB.
app.use(
    compression({
        level: 6,                      // balanced speed vs. compression ratio
        threshold: 1024,               // skip responses smaller than 1 KB
        filter: (req: Request, res: Response) => {
            // Don't compress server-sent events
            if (req.headers['x-no-compression']) return false;
            return compression.filter(req, res);
        },
    })
);

// NOTE: `credentials: true` is incompatible with `origin: '*'`.
// Browsers will block credentialed preflight requests if the server
// responds with a wildcard origin. We must always use an explicit list.
const allowedOrigins = isProduction()
    ? [env.frontendUrl]
    : [
        'http://localhost:4200',  // Angular dev server
        'http://localhost:3000',  // Backend (for self-requests / Swagger)
        env.frontendUrl,          // Honour any override set in .env
    ];

app.use(
    cors({
        origin: (requestOrigin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) => {
            // Allow server-to-server requests (no Origin header) and listed origins
            if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
                callback(null, requestOrigin ?? true);
            } else {
                callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
);

// 100 KB is generous for a REST API.  A 10 MB limit was a DoS risk.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Required to read the HttpOnly refresh token cookie sent by the client.
app.use(cookieParser());

app.use(rateLimitMiddleware);

// Winston-native middleware: logs method, URL, status, and response time.
// In production only 4xx/5xx responses are logged to reduce noise.
app.use(httpLogger);

app.use(`/api/${env.apiVersion}`, routes);

app.get('/', (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Healthcare Appointment System API',
        version: env.apiVersion,
        documentation: `/api/${env.apiVersion}/docs`,
    });
});

app.use(notFoundHandler);

app.use(errorMiddleware);

export default app;
