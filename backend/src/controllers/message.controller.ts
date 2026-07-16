import { Response } from 'express';
import { messageService } from '../services';
import { successResponse, createdResponse, paginatedResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import {
  AuthenticatedRequest,
  AuthenticatedBodyRequest,
  AuthenticatedQueryRequest,
} from '../types/express-augment';
import type {
  SendMessageBody,
  PaginationQuery,
  ConversationRequest,
  GetUsersRequest,
} from '../dto/message.dto';

/**
 * Send a message to another user
 */
export const sendMessage = asyncHandler(async (req: AuthenticatedBodyRequest<SendMessageBody>, res: Response) => {
  const { receiverId, content } = req.body;

  const message = await messageService.sendMessage({
    senderId: req.user.userId,
    receiverId,
    content,
    senderRole: req.user.role,
  });

  createdResponse(res, { message }, 'Message sent successfully');
});

/**
 * Get conversation with a specific user
 */
export const getConversation = asyncHandler(
  async (req: AuthenticatedQueryRequest<PaginationQuery> & ConversationRequest, res: Response) => {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const { messages, total } = await messageService.getConversation(
      req.user.userId,
      userId,
      page,
      limit
    );

    paginatedResponse(res, messages, total, page, limit);
  }
);

/**
 * Get all conversations (inbox) for the current user
 */
export const getConversationList = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const conversations = await messageService.getConversationList(req.user.userId);

    successResponse(res, { conversations });
  }
);

/**
 * Get unread message count for the current user
 */
export const getUnreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await messageService.getUnreadCount(req.user.userId);
  successResponse(res, { unreadCount: count });
});

/**
 * Mark messages from a sender as read
 */
export const markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { senderId } = req.params;

  await messageService.markAsRead(req.user.userId, senderId);

  successResponse(res, null, 'Messages marked as read');
});

/**
 * Get list of users available to message (paginated)
 */
export const getUsers = asyncHandler(async (req: AuthenticatedQueryRequest<PaginationQuery> & GetUsersRequest, res: Response) => {
  const { page, limit } = req.query;

  const { users, total } = await messageService.getUsers(
    req.user.userId,
    req.user.role,
    page,
    limit
  );
  successResponse(res, { users, total, page, limit });
});
