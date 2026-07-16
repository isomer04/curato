
jest.mock('../../services/message.service', () => ({
  messageService: {
    sendMessage: jest.fn(),
    getConversation: jest.fn(),
    getConversationList: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    getUsers: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));


import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import * as messageController from '../../controllers/message.controller';
import { messageService } from '../../services/message.service';
import { UserRole } from '../../types/constants';


const SENDER_ID = '7ca0f8f8-3e5e-49b2-a42e-13c54460775d';
const RECEIVER_ID = '123e4567-e89b-12d3-a456-426614174000';
const MESSAGE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    user: { userId: SENDER_ID, email: 'test@test.com', role: UserRole.PATIENT },
    params: {},
    query: {},
    body: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

const makeMessage = (overrides = {}) => ({
  id: MESSAGE_ID,
  senderId: SENDER_ID,
  receiverId: RECEIVER_ID,
  content: 'Hello doctor',
  isRead: false,
  createdAt: new Date(),
  ...overrides,
});

const flushPromises = () => new Promise(setImmediate);


describe('Message Controller', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('sendMessage', () => {
    const body = { receiverId: RECEIVER_ID, content: 'Hello doctor' };

    it('happy path — sends message and returns 201', async () => {
      const message = makeMessage();
      (messageService.sendMessage as jest.Mock).mockResolvedValue(message);
      const req = mockReq({ body });
      const res = mockRes();

      await messageController.sendMessage(req, res, mockNext);
      await flushPromises();

      expect(messageService.sendMessage).toHaveBeenCalledWith({
        senderId: SENDER_ID,
        receiverId: RECEIVER_ID,
        content: 'Hello doctor',
        senderRole: UserRole.PATIENT,
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('forwards service ForbiddenError to next()', async () => {
      const err = new Error('no completed appointment');
      (messageService.sendMessage as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body });
      const res = mockRes();

      await messageController.sendMessage(req, res, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getConversation', () => {
    it('happy path — returns messages and total with 200', async () => {
      const result = { messages: [makeMessage()], total: 1 };
      (messageService.getConversation as jest.Mock).mockResolvedValue(result);
      const req = mockReq({
        params: { userId: RECEIVER_ID },
        query: { page: 1, limit: 20 } as unknown as Record<string, string>,
      });
      const res = mockRes();

      await messageController.getConversation(req, res, mockNext);
      await flushPromises();

      expect(messageService.getConversation).toHaveBeenCalledWith(
        SENDER_ID,
        RECEIVER_ID,
        1,
        20
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('works without page/limit query params (uses defaults)', async () => {
      (messageService.getConversation as jest.Mock).mockResolvedValue({ messages: [], total: 0 });
      const req = mockReq({ params: { userId: RECEIVER_ID }, query: {} });
      const res = mockRes();

      await messageController.getConversation(req, res, mockNext);
      await flushPromises();

      expect(messageService.getConversation).toHaveBeenCalledWith(
        SENDER_ID,
        RECEIVER_ID,
        undefined,
        undefined
      );
    });

    it('forwards errors to next()', async () => {
      const err = new Error('not found');
      (messageService.getConversation as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { userId: RECEIVER_ID }, query: {} });
      const res = mockRes();

      await messageController.getConversation(req, res, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getConversationList', () => {
    it('returns list of conversations with 200', async () => {
      const conversations = [{ partnerId: RECEIVER_ID, unreadCount: 2 }];
      (messageService.getConversationList as jest.Mock).mockResolvedValue(conversations);
      const req = mockReq();
      const res = mockRes();

      await messageController.getConversationList(req, res, mockNext);
      await flushPromises();

      expect(messageService.getConversationList).toHaveBeenCalledWith(SENDER_ID);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns empty list when no conversations exist', async () => {
      (messageService.getConversationList as jest.Mock).mockResolvedValue([]);
      const req = mockReq();
      const res = mockRes();

      await messageController.getConversationList(req, res, mockNext);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });


  describe('getUnreadCount', () => {
    it('returns unread message count with 200', async () => {
      (messageService.getUnreadCount as jest.Mock).mockResolvedValue(5);
      const req = mockReq();
      const res = mockRes();

      await messageController.getUnreadCount(req, res, mockNext);
      await flushPromises();

      expect(messageService.getUnreadCount).toHaveBeenCalledWith(SENDER_ID);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 0 when no unread messages', async () => {
      (messageService.getUnreadCount as jest.Mock).mockResolvedValue(0);
      const req = mockReq();
      const res = mockRes();

      await messageController.getUnreadCount(req, res, mockNext);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });


  describe('markAsRead', () => {
    it('marks messages as read and returns 200', async () => {
      (messageService.markAsRead as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ params: { senderId: RECEIVER_ID } });
      const res = mockRes();

      await messageController.markAsRead(req, res, mockNext);
      await flushPromises();

      expect(messageService.markAsRead).toHaveBeenCalledWith(SENDER_ID, RECEIVER_ID);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('error');
      (messageService.markAsRead as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { senderId: RECEIVER_ID } });
      const res = mockRes();

      await messageController.markAsRead(req, res, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });


  describe('getUsers', () => {
    it('returns eligible messaging partners with 200', async () => {
      const result = { users: [{ id: RECEIVER_ID }], total: 1 };
      (messageService.getUsers as jest.Mock).mockResolvedValue(result);
      const req = mockReq({
        query: { page: 1, limit: 10 } as unknown as Record<string, string>,
      });
      const res = mockRes();

      await messageController.getUsers(req, res, mockNext);
      await flushPromises();

      expect(messageService.getUsers).toHaveBeenCalledWith(
        SENDER_ID,
        UserRole.PATIENT,
        1,
        10
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('works without pagination params (uses defaults)', async () => {
      (messageService.getUsers as jest.Mock).mockResolvedValue({ users: [], total: 0 });
      const req = mockReq({ query: {} });
      const res = mockRes();

      await messageController.getUsers(req, res, mockNext);
      await flushPromises();

      expect(messageService.getUsers).toHaveBeenCalledWith(
        SENDER_ID,
        UserRole.PATIENT,
        undefined,
        undefined
      );
    });

    it('forwards errors to next()', async () => {
      const err = new Error('error');
      (messageService.getUsers as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ query: {} });
      const res = mockRes();

      await messageController.getUsers(req, res, mockNext);
      await flushPromises();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
