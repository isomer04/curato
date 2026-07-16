import { Transaction } from 'sequelize';
import { Notification } from '../models';
import { NotificationType } from '../types/constants';
import { NotificationMetadata } from '../models/Notification.model';
import { logger } from '../config/logger';
import { notificationRepository } from '../repositories/notification.repository';

class NotificationService {
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata,
    transaction?: Transaction
  ): Promise<Notification> {
    const notification = await notificationRepository.create(
      { userId, type, title, message, metadata },
      transaction
    );
    // Log only non-PHI metadata; title/message may contain patient names or
    // appointment details which are PHI under HIPAA.
    logger.info('Notification created', {
      notificationId: notification.id,
      userId,
      type,
    });
    return notification;
  }

  async createAppointmentNotification(
    userId: string,
    title: string,
    message: string,
    type: 'appointment_reminder' | 'appointment_cancelled' | 'appointment_confirmed',
    metadata: NotificationMetadata,
    transaction?: Transaction
  ): Promise<Notification> {
    const notificationType = {
      appointment_reminder: NotificationType.APPOINTMENT_REMINDER,
      appointment_cancelled: NotificationType.APPOINTMENT_CANCELLED,
      appointment_confirmed: NotificationType.APPOINTMENT_CONFIRMED,
    }[type];

    return this.create(userId, notificationType, title, message, metadata, transaction);
  }

  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    return notificationRepository.findByUserId(userId, page, limit, unreadOnly);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await notificationRepository.findOne(notificationId, userId);
    if (notification) {
      await notificationRepository.markAsRead(notification, new Date());
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    await notificationRepository.deleteById(notificationId, userId);
  }
}

export const notificationService = new NotificationService();
