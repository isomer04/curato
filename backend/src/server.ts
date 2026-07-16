import app, { initializeApp } from './app';
import { env, validateProductionEnv } from './config/env';
import { logger } from './config/logger';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeEmailTransporter } from './config/email';

const startServer = async (): Promise<void> => {
  try {
    // Validate critical environment variables before anything else
    validateProductionEnv();

    // Initialize database connection
    await initializeDatabase();

    // Initialize SendGrid email client
    initializeEmailTransporter();

    // Initialize Sequelize associations and event-bus subscribers
    initializeApp();

    // Start Express server
    const server = app.listen(env.port, () => {
      logger.info(`
        ╔════════════════════════════════════════════════════════╗
        ║                                                        ║
        ║   🏥 Healthcare Appointment System API                 ║
        ║                                                        ║
        ║   Server running on: http://localhost:${env.port}            ║
        ║   Environment: ${env.nodeEnv.padEnd(35)}  ║
        ║   API Version: ${env.apiVersion.padEnd(35)}  ║
        ║                                                        ║
        ╚════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string): void => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(() => {
        logger.info('HTTP server closed.');

        closeDatabase()
          .then(() => {
            logger.info('Database connection closed.');
            process.exit(0);
          })
          .catch((error: unknown) => {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          });
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

void startServer();
