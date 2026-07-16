import { Transaction } from 'sequelize';
import { Notification } from '../models';
import { NotificationType } from '../types/constants';
import { NotificationMetadata } from '../models/Notification.model';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
}

class NotificationRepository {
  async create(data: CreateNotificationData, transaction?: Transaction): Promise<Notification> {
    return Notification.create(data as Notification['_creationAttributes'], { transaction });
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where: { userId: string; isRead?: boolean } = { userId };
    if (unreadOnly) where.isRead = false;

    const offset = (page - 1) * limit;
    const { rows: notifications, count: total } = await Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { notifications, total };
  }

  async findOne(notificationId: string, userId: string): Promise<Notification | null> {
    return Notification.findOne({ where: { id: notificationId, userId } });
  }

  async markAsRead(notification: Notification, readAt: Date): Promise<void> {
    await notification.update({ isRead: true, readAt });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, isRead: false } }
    );
  }

  async countUnread(userId: string): Promise<number> {
    return Notification.count({ where: { userId, isRead: false } });
  }

  async deleteById(notificationId: string, userId: string): Promise<void> {
    await Notification.destroy({ where: { id: notificationId, userId } });
  }
}

export const notificationRepository = new NotificationRepository();
