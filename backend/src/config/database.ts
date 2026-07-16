import { readFileSync } from 'node:fs';
import { Sequelize } from 'sequelize';
import { env, isProduction } from './env';
import { logger } from './logger';
import { DB_POOL_MIN, DB_POOL_MAX } from './constants';

const dbHost = env.dbHost;
const dbPort = env.dbPort;
const dbName = env.dbName;
const dbUser = env.dbUser;
const dbPassword = env.dbPassword;

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: dbHost,
  port: dbPort,
  database: dbName,
  username: dbUser,
  password: dbPassword,
  logging: false, // Set to false to prevent logging every SQL script to console
  pool: {
    max: isProduction() ? DB_POOL_MAX : 5,
    min: isProduction() ? DB_POOL_MIN : 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
  dialectOptions: {
    charset: 'utf8mb4',
    typeCast: true,
    // Enforce TLS for database connections in production.
    // HIPAA §164.312(e)(1) requires encryption for PHI in transit.
    // mysql2 uses the Node.js tls module; setting ssl to true triggers
    // TLS negotiation and rejects unverified server certificates.
    // DB_SSL_CA_PATH must point to the AWS RDS CA bundle on Lightsail:
    //   /home/ubuntu/certs/aws-rds-global-bundle.pem
    // Download: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
    ...(isProduction() && {
      ssl: {
        ca: process.env['DB_SSL_CA_PATH']
          ? readFileSync(process.env['DB_SSL_CA_PATH'])
          : undefined,
        rejectUnauthorized: true,
      },
    }),
  },
  timezone: '+00:00', // UTC timezone
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Migration-first lifecycle: do not mutate schema implicitly.
    // Explicitly opt-in to sync only for local prototyping.
    if (!isProduction() && process.env['ALLOW_DB_SYNC'] === 'true') {
      const forceSync = process.env['CLEAN_SYNC'] === 'true';
      await sequelize.sync({ force: forceSync, alter: false });
      if (forceSync) {
        logger.warn('CLEAN_SYNC=true: all tables were dropped and recreated.');
      }
      logger.warn('ALLOW_DB_SYNC=true enabled. Prefer migrations for all schema changes.');
    } else {
      logger.info('Skipping sequelize.sync(). Run migrations with "npm run migrate".');
    }
  } catch (error: unknown) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('Database connection closed.');
  } catch (error: unknown) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};

export { sequelize };
