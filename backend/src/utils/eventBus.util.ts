import { EventEmitter } from 'events';
import { logger } from '../config/logger';

/**
 * Application-wide event bus.
 *
 * Wraps Node's EventEmitter with an error boundary so that a crashing
 * subscriber does not take down the process or silence subsequent listeners.
 *
 * ⚠️  PRODUCTION LIMITATIONS (must be addressed before multi-instance deployment):
 *
 * 1. **In-process only** — Events are lost if the server crashes between
 *    emit and handler completion. No persistence or delivery guarantee.
 * 2. **Single instance** — Cannot deliver events across multiple backend
 *    instances. Scaling horizontally requires a real message broker
 *    (e.g. RabbitMQ, Redis Streams, AWS SQS).
 * 3. **No retry / dead-letter** — A failed handler is logged but never
 *    retried. For healthcare notifications (appointment confirmations,
 *    reminders) a message queue with retry and dead-letter support is
 *    required to guarantee delivery.
 *
 * TODO: Replace with a durable message broker before production deployment.
 */
class SafeEventBus extends EventEmitter {
  override emit(eventName: string | symbol, ...args: unknown[]): boolean {
    const listeners = this.listeners(eventName);
    for (const listener of listeners) {
      if (typeof listener !== 'function') {
        continue;
      }

      try {
        (listener as (...a: unknown[]) => void)(...args);
      } catch (error: unknown) {
        logger.error(`EventBus subscriber crashed on "${String(eventName)}"`, { error });
      }
    }
    return listeners.length > 0;
  }
}

export const AppEventBus = new SafeEventBus();

export const SystemEvents = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
};
