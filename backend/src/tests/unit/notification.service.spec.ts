jest.mock('../../repositories/notification.repository', () => ({
  notificationRepository: {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    countUnread: jest.fn(),
    deleteById: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { notificationService } from '../../services/notification.service';
import { notificationRepository } from '../../repositories/notification.repository';
import { NotificationType } from '../../types/constants';

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 'n1',
  userId: 'u1',
  type: NotificationType.NEW_MESSAGE,
  title: 'Test Notification',
  message: 'This is a test',
  isRead: false,
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('NotificationService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('create', () => {
    it('creates a notification and returns it', async () => {
      const mockNotif = makeNotification();
      (notificationRepository.create as jest.Mock).mockResolvedValue(mockNotif);

      const result = await notificationService.create(
        'u1',
        NotificationType.NEW_MESSAGE,
        'Test Notification',
        'This is a test'
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', title: 'Test Notification' }),
        undefined
      );
      expect(result).toBe(mockNotif);
    });

    it('passes optional metadata and transaction', async () => {
      const mockNotif = makeNotification();
      (notificationRepository.create as jest.Mock).mockResolvedValue(mockNotif);
      const fakeTx = {} as unknown as import('sequelize').Transaction;

      await notificationService.create(
        'u1',
        NotificationType.APPOINTMENT_REMINDER,
        'Reminder',
        'Your appointment is tomorrow',
        { appointmentId: 'a1' },
        fakeTx
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { appointmentId: 'a1' } }),
        fakeTx
      );
    });
  });


  describe('createAppointmentNotification', () => {
    const types = [
      { input: 'appointment_reminder', output: NotificationType.APPOINTMENT_REMINDER },
      { input: 'appointment_cancelled', output: NotificationType.APPOINTMENT_CANCELLED },
      { input: 'appointment_confirmed', output: NotificationType.APPOINTMENT_CONFIRMED },
    ] as const;

    types.forEach(({ input, output }) => {
      it(`maps '${input}' → NotificationType.${output}`, async () => {
        (notificationRepository.create as jest.Mock).mockResolvedValue(makeNotification());
        await notificationService.createAppointmentNotification('u1', 'Title', 'Msg', input, {
          appointmentId: 'a1',
        });
        expect(notificationRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ type: output }),
          undefined
        );
      });
    });
  });


  describe('getUserNotifications', () => {
    it('returns paginated notifications', async () => {
      (notificationRepository.findByUserId as jest.Mock).mockResolvedValue({
        notifications: [makeNotification()],
        total: 1,
      });
      const result = await notificationService.getUserNotifications('u1');
      expect(result.total).toBe(1);
    });

    it('passes unreadOnly flag', async () => {
      (notificationRepository.findByUserId as jest.Mock).mockResolvedValue({
        notifications: [],
        total: 0,
      });
      await notificationService.getUserNotifications('u1', 1, 20, true);
      expect(notificationRepository.findByUserId).toHaveBeenCalledWith('u1', 1, 20, true);
    });
  });


  describe('markAsRead', () => {
    it('marks notification as read when found', async () => {
      const mockNotif = makeNotification();
      (notificationRepository.findOne as jest.Mock).mockResolvedValue(mockNotif);

      await notificationService.markAsRead('n1', 'u1');

      expect(notificationRepository.markAsRead).toHaveBeenCalledWith(mockNotif, expect.any(Date));
    });

    it('does not call markAsRead when notification not found', async () => {
      (notificationRepository.findOne as jest.Mock).mockResolvedValue(null);
      await notificationService.markAsRead('ghost', 'u1');
      expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
    });
  });


  describe('markAllAsRead', () => {
    it('delegates to repository', async () => {
      (notificationRepository.markAllAsRead as jest.Mock).mockResolvedValue(undefined);
      await notificationService.markAllAsRead('u1');
      expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith('u1');
    });
  });


  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      (notificationRepository.countUnread as jest.Mock).mockResolvedValue(5);
      const count = await notificationService.getUnreadCount('u1');
      expect(count).toBe(5);
    });

    it('returns 0 when no unread', async () => {
      (notificationRepository.countUnread as jest.Mock).mockResolvedValue(0);
      const count = await notificationService.getUnreadCount('u1');
      expect(count).toBe(0);
    });
  });


  describe('delete', () => {
    it('delegates to repository', async () => {
      (notificationRepository.deleteById as jest.Mock).mockResolvedValue(undefined);
      await notificationService.delete('n1', 'u1');
      expect(notificationRepository.deleteById).toHaveBeenCalledWith('n1', 'u1');
    });
  });
});
