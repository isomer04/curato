jest.mock('../../repositories/message.repository', () => ({
  messageRepository: {
    create: jest.fn(),
    findReceiverActive: jest.fn(),
    findConversation: jest.fn(),
    findConversationList: jest.fn(),
    markConversationAsRead: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    findActiveUsers: jest.fn(),
    findEligiblePartners: jest.fn(),
  },
}));

jest.mock('../../repositories/appointment.repository', () => ({
  appointmentRepository: {
    hasCompletedAppointmentBetweenUsers: jest.fn(),
  },
}));

import { messageService } from '../../services/message.service';
import { messageRepository } from '../../repositories/message.repository';
import { appointmentRepository } from '../../repositories/appointment.repository';

const makeMsg = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
  content: 'Hello',
  isRead: false,
  createdAt: new Date(),
  toJSON: jest.fn().mockReturnValue({
    id: 'm1',
    senderId: 'u1',
    receiverId: 'u2',
    content: 'Hello',
    isRead: false,
    createdAt: new Date(),
    sender: { id: 'u1', firstName: 'Alice', lastName: 'A', role: 'patient' },
    receiver: { id: 'u2', firstName: 'Bob', lastName: 'B', role: 'doctor' },
  }),
  ...overrides,
});

describe('MessageService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('sendMessage', () => {
    it('happy path — patient sends a message to doctor after completed appointment', async () => {
      const mockMsg = makeMsg();
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
        role: 'doctor',
      });
      (appointmentRepository.hasCompletedAppointmentBetweenUsers as jest.Mock).mockResolvedValue(
        true
      );
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMsg);

      const result = await messageService.sendMessage({
        senderId: 'u1',
        receiverId: 'u2',
        content: 'Hello',
        senderRole: 'patient',
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ senderId: 'u1', receiverId: 'u2', content: 'Hello' })
      );
      expect(result).toBe(mockMsg);
    });

    it('trims whitespace from message content', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
        role: 'doctor',
      });
      (appointmentRepository.hasCompletedAppointmentBetweenUsers as jest.Mock).mockResolvedValue(
        true
      );
      (messageRepository.create as jest.Mock).mockResolvedValue(makeMsg());

      await messageService.sendMessage({
        senderId: 'u1',
        receiverId: 'u2',
        content: '  Hi!  ',
        senderRole: 'patient',
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Hi!' })
      );
    });

    it('throws when receiver not found', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue(null);
      await expect(
        messageService.sendMessage({
          senderId: 'u1',
          receiverId: 'ghost',
          content: 'Hi',
          senderRole: 'patient',
        })
      ).rejects.toThrow('Receiver not found');
    });

    it('throws when receiver account is deactivated', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: false,
        role: 'doctor',
      });
      await expect(
        messageService.sendMessage({
          senderId: 'u1',
          receiverId: 'u2',
          content: 'Hi',
          senderRole: 'patient',
        })
      ).rejects.toThrow('deactivated');
    });

    it('throws when sender and receiver are the same user', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
        role: 'patient',
      });
      await expect(
        messageService.sendMessage({
          senderId: 'u1',
          receiverId: 'u1',
          content: 'Hi',
          senderRole: 'patient',
        })
      ).rejects.toThrow('Cannot send a message to yourself');
    });

    it('throws ForbiddenError when patient tries to message doctor without completed appointment', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
        role: 'doctor',
      });
      (appointmentRepository.hasCompletedAppointmentBetweenUsers as jest.Mock).mockResolvedValue(
        false
      );

      await expect(
        messageService.sendMessage({
          senderId: 'u1',
          receiverId: 'u2',
          content: 'Hi',
          senderRole: 'patient',
        })
      ).rejects.toThrow('completed appointment');
    });

    it('throws ForbiddenError when patient tries to message another patient', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
        role: 'patient',
      });

      await expect(
        messageService.sendMessage({
          senderId: 'u1',
          receiverId: 'u2',
          content: 'Hi',
          senderRole: 'patient',
        })
      ).rejects.toThrow('different role');
    });

    it('allows admin to message any user without appointment check', async () => {
      const mockMsg = makeMsg();
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
        role: 'patient',
      });
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMsg);

      const result = await messageService.sendMessage({
        senderId: 'admin1',
        receiverId: 'u2',
        content: 'Admin message',
        senderRole: 'admin',
      });

      expect(appointmentRepository.hasCompletedAppointmentBetweenUsers).not.toHaveBeenCalled();
      expect(result).toBe(mockMsg);
    });

    it('allows any user to message an admin without appointment check', async () => {
      const mockMsg = makeMsg();
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'admin1',
        isActive: true,
        role: 'admin',
      });
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMsg);

      const result = await messageService.sendMessage({
        senderId: 'u1',
        receiverId: 'admin1',
        content: 'Hello admin',
        senderRole: 'patient',
      });

      expect(appointmentRepository.hasCompletedAppointmentBetweenUsers).not.toHaveBeenCalled();
      expect(result).toBe(mockMsg);
    });
  });


  describe('getConversation', () => {
    it('returns paginated messages and marks read', async () => {
      (messageRepository.findConversation as jest.Mock).mockResolvedValue({
        messages: [makeMsg()],
        total: 1,
      });
      (messageRepository.markConversationAsRead as jest.Mock).mockResolvedValue(undefined);

      const result = await messageService.getConversation('u1', 'u2', 1, 50);

      expect(result.total).toBe(1);
      expect(messageRepository.markConversationAsRead).toHaveBeenCalledWith('u2', 'u1');
    });

    it('forwards page and limit to repository', async () => {
      (messageRepository.findConversation as jest.Mock).mockResolvedValue({
        messages: [],
        total: 0,
      });
      (messageRepository.markConversationAsRead as jest.Mock).mockResolvedValue(undefined);

      await messageService.getConversation('u1', 'u2', 3, 10);

      expect(messageRepository.findConversation).toHaveBeenCalledWith('u1', 'u2', 3, 10);
    });
  });


  describe('getConversationList', () => {
    it('returns sorted conversation list with unread counts', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60_000);

      const rows = [
        {
          partnerId: 'u2',
          firstName: 'Bob',
          lastName: 'B',
          role: 'doctor',
          lastMessage: 'Hi',
          lastMessageAt: now,
          unreadCount: 1,
        },
        {
          partnerId: 'u3',
          firstName: 'Carol',
          lastName: 'C',
          role: 'patient',
          lastMessage: 'Hey',
          lastMessageAt: earlier,
          unreadCount: 0,
        },
      ];

      (messageRepository.findConversationList as jest.Mock).mockResolvedValue(rows);

      const result = await messageService.getConversationList('u1');

      // 2 distinct partners
      expect(result).toHaveLength(2);
      // Most recent first (returned in order from SQL)
      expect(result[0].userId).toBe('u2');
      // Unread count for message from u2 to u1 that is not read
      expect(result[0].unreadCount).toBe(1);
    });

    it('returns empty array when no messages', async () => {
      (messageRepository.findConversationList as jest.Mock).mockResolvedValue([]);
      const result = await messageService.getConversationList('u1');
      expect(result).toHaveLength(0);
    });

    it('maps conversation rows to ConversationPartner format', async () => {
      const row = {
        partnerId: 'u2',
        firstName: 'Bob',
        lastName: 'B',
        role: 'doctor',
        lastMessage: 'Hi',
        lastMessageAt: new Date(),
        unreadCount: '3', // SQL returns string numbers
      };
      (messageRepository.findConversationList as jest.Mock).mockResolvedValue([row]);
      const result = await messageService.getConversationList('u1');
      expect(result).toHaveLength(1);
      expect(result[0].unreadCount).toBe(3); // converted to number
    });
  });


  describe('getUnreadCount', () => {
    it('returns unread count from repository', async () => {
      (messageRepository.countUnread as jest.Mock).mockResolvedValue(3);
      const count = await messageService.getUnreadCount('u1');
      expect(count).toBe(3);
    });
  });


  describe('markAsRead', () => {
    it('delegates to repository', async () => {
      (messageRepository.markAsRead as jest.Mock).mockResolvedValue(undefined);
      await messageService.markAsRead('u1', 'u2');
      expect(messageRepository.markAsRead).toHaveBeenCalledWith('u1', 'u2');
    });
  });


  describe('getUsers', () => {
    it('admin — returns all active users from findActiveUsers', async () => {
      const users = [
        { id: 'u2', firstName: 'Bob' },
        { id: 'u3', firstName: 'Carol' },
      ];
      (messageRepository.findActiveUsers as jest.Mock).mockResolvedValue({ users, total: 2 });

      const result = await messageService.getUsers('u1', 'admin');

      expect(result).toEqual({ users, total: 2 });
      expect(messageRepository.findActiveUsers).toHaveBeenCalledWith('u1', 1, 50);
      expect(messageRepository.findEligiblePartners).not.toHaveBeenCalled();
    });

    it('patient — returns eligible partners from findEligiblePartners', async () => {
      const users = [{ id: 'doc1', firstName: 'Dr. Alice' }];
      (messageRepository.findEligiblePartners as jest.Mock).mockResolvedValue({ users, total: 1 });

      const result = await messageService.getUsers('u1', 'patient');

      expect(result).toEqual({ users, total: 1 });
      expect(messageRepository.findEligiblePartners).toHaveBeenCalledWith('u1', 'patient', 1, 50);
      expect(messageRepository.findActiveUsers).not.toHaveBeenCalled();
    });

    it('doctor — returns eligible partners from findEligiblePartners', async () => {
      const users = [{ id: 'p1', firstName: 'Alice' }];
      (messageRepository.findEligiblePartners as jest.Mock).mockResolvedValue({ users, total: 1 });

      const result = await messageService.getUsers('doc1', 'doctor');

      expect(result).toEqual({ users, total: 1 });
      expect(messageRepository.findEligiblePartners).toHaveBeenCalledWith('doc1', 'doctor', 1, 50);
    });
  });
});
