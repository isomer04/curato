import { z } from 'zod';
import type { Request } from 'express';
import { trimmedText } from '../utils/zod.util';

const uuidParam = z.uuid({ message: 'Must be a valid UUID' });


export const SendMessageBodySchema = z.strictObject({
  receiverId: uuidParam,
  content: trimmedText()
    .min(1, 'Message content cannot be empty')
    .max(4000, 'Message content must not exceed 4000 characters'),
});

export type SendMessageBody = z.infer<typeof SendMessageBodySchema>;

/** Shared pagination query schema (page & limit) */
export const PaginationQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Typed Express request for GET /conversations/:userId */
export type ConversationRequest = Request<{ userId: string }, unknown, unknown, PaginationQuery>;

/** Typed Express request for GET /users */
export type GetUsersRequest = Request<Record<string, string>, unknown, unknown, PaginationQuery>;


/** Validates the :userId route param (GET /conversations/:userId) */
export const userIdParamValidation = z.object({
  params: z.strictObject({
    userId: uuidParam,
  }),
});

/** Validates the :senderId route param (PATCH /read/:senderId) */
export const senderIdParamValidation = z.object({
  params: z.strictObject({
    senderId: uuidParam,
  }),
});

export const sendMessageValidation = z.object({ body: SendMessageBodySchema });
export const paginationValidation = z.object({ query: PaginationQuerySchema });
