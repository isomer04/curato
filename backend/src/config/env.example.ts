/**
 * env.example.ts — Safe template for env.ts
 *
 * Copy this file to env.ts and replace the placeholder values:
 *   cp src/config/env.example.ts src/config/env.ts
 *
 * env.ts is gitignored to protect secrets. Never commit real keys here.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './constants';

// Load environment variables from .env file
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  // Application
  nodeEnv: string;
  port: number;
  apiVersion: string;

  // Database
  dbDialect: 'mysql';
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  mfaTokenSecret: string;

  // Frontend
  frontendUrl: string;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // Email
  sendgridApiKey: string;
  emailFromAddress: string;

  // Logging
  logLevel: string;

  // Encryption
  encryptionKey: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

const getEnvVarAsNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} is not a valid number`);
  }
  return parsed;
};

const isProd = process.env['NODE_ENV'] === 'production';

export const env: EnvConfig = {
  // Application
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvVarAsNumber('PORT', 3000),
  apiVersion: getEnvVar('API_VERSION', 'v1'),

  // Database
  dbDialect: getEnvVar('DB_DIALECT', 'mysql') as 'mysql',
  dbHost: getEnvVar('DB_HOST', 'localhost'),
  dbPort: getEnvVarAsNumber('DB_PORT', 3306),
  dbName: getEnvVar('DB_NAME', 'healthcare_db'),
  dbUser: getEnvVar('DB_USER', 'root'),
  dbPassword: getEnvVar('DB_PASSWORD', ''),

  // JWT — no defaults in production to prevent deploying with weak secrets
  jwtSecret: isProd ? getEnvVar('JWT_SECRET') : getEnvVar('JWT_SECRET', 'REPLACE_WITH_JWT_SECRET'),
  jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '15m'),
  jwtRefreshSecret: isProd
    ? getEnvVar('JWT_REFRESH_SECRET')
    : getEnvVar('JWT_REFRESH_SECRET', 'REPLACE_WITH_JWT_REFRESH_SECRET'),
  jwtRefreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  mfaTokenSecret: isProd
    ? getEnvVar('MFA_TOKEN_SECRET')
    : getEnvVar('MFA_TOKEN_SECRET', 'REPLACE_WITH_MFA_TOKEN_SECRET'),

  // Frontend
  frontendUrl: getEnvVar('FRONTEND_URL', 'http://localhost:4200'),

  // Rate Limiting (defaults mirror config/constants.ts)
  rateLimitWindowMs: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', RATE_LIMIT_WINDOW_MS),
  rateLimitMaxRequests: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', RATE_LIMIT_MAX_REQUESTS),

  // Email
  sendgridApiKey: getEnvVar('SENDGRID_API_KEY', ''),
  emailFromAddress: getEnvVar('EMAIL_FROM', ''),

  // Logging
  logLevel: getEnvVar('LOG_LEVEL', 'debug'),

  // Encryption — used for encrypting MFA secrets at rest
  encryptionKey: isProd
    ? getEnvVar('ENCRYPTION_KEY')
    : getEnvVar('ENCRYPTION_KEY', 'REPLACE_WITH_ENCRYPTION_KEY_32_CHARS'),
};

export const isProduction = (): boolean => env.nodeEnv === 'production';
export const isDevelopment = (): boolean => env.nodeEnv === 'development';
export const isTest = (): boolean => env.nodeEnv === 'test';

/**
 * Validate that all critical environment variables are properly configured.
 * Call this on startup to fail fast if security-critical config is missing.
 */
export const validateProductionEnv = (): void => {
  if (!isProduction()) return;

  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MFA_TOKEN_SECRET',
    'ENCRYPTION_KEY',
    'DB_PASSWORD',
    'SENDGRID_API_KEY',
    'EMAIL_FROM',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing critical environment variables for production: ${missing.join(', ')}`);
  }

  // Ensure cryptographic secrets are sufficiently strong (at least 32 chars).
  // Email-style variables (EMAIL_FROM) are excluded from this check — they are
  // validated for presence only and are not secret values.
  const secretVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MFA_TOKEN_SECRET', 'ENCRYPTION_KEY'];
  const weakSecrets = secretVars.filter(v => {
    const val = process.env[v];
    return val !== undefined && val.length < 32;
  });
  if (weakSecrets.length > 0) {
    throw new Error(`Weak secrets detected (must be ≥32 chars): ${weakSecrets.join(', ')}`);
  }
};
