import { Message } from '../models/Message.model';
import {
  messageRepository,
  ConversationRow,
  EligiblePartnerRow,
} from '../repositories/message.repository';
import { appointmentRepository } from '../repositories/appointment.repository';
import { ForbiddenError, BadRequestError, NotFoundError } from '../shared/errors';
import { UserRole } from '../types/constants';

export interface ConversationPartner {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export interface SendMessageData {
  senderId: string;
  receiverId: string;
  content: string;
  senderRole: UserRole;
}

class MessageService {
  /**
   * Send a new message from sender to receiver.
   *
   * Access rules:
   *  - Admins may message anyone and receive from anyone.
   *  - Patients may only message doctors they have had a completed appointment with.
   *  - Doctors may only message patients they have had a completed appointment with.
   *  - Peer messaging (patient↔patient, doctor↔doctor) is not permitted.
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    const receiver = await messageRepository.findReceiverActive(data.receiverId);
    if (!receiver) throw new NotFoundError('Receiver not found');
    if (!receiver.isActive) throw new BadRequestError('Receiver account is deactivated');
    if (data.senderId === data.receiverId)
      throw new BadRequestError('Cannot send a message to yourself');

    const senderRole = data.senderRole;
    const receiverRole = receiver.role as UserRole;

    // Enforce appointment-based messaging restrictions for non-admin users.
    if (senderRole !== UserRole.ADMIN && receiverRole !== UserRole.ADMIN) {
      if (senderRole === receiverRole) {
        throw new ForbiddenError('You can only message users with a different role');
      }

      // One party is a patient, the other is a doctor.
      const patientUserId = senderRole === UserRole.PATIENT ? data.senderId : data.receiverId;
      const doctorUserId = senderRole === UserRole.DOCTOR ? data.senderId : data.receiverId;

      const hasAppointment = await appointmentRepository.hasCompletedAppointmentBetweenUsers(
        patientUserId,
        doctorUserId
      );
      if (!hasAppointment) {
        throw new ForbiddenError(
          'You can only send messages after a completed appointment with this doctor'
        );
      }
    }

    return messageRepository.create({
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content.trim(),
    });
  }

  /**
   * Get conversation between two users (paginated)
   */
  async getConversation(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: Message[]; total: number }> {
    const result = await messageRepository.findConversation(userId, otherUserId, page, limit);

    // Mark messages as read (messages sent to current user)
    await messageRepository.markConversationAsRead(otherUserId, userId);

    return result;
  }

  /**
   * Get all conversation partners for a user (inbox view).
   *
   * Previous implementation loaded ALL messages into JS memory and
   * aggregated with a Map — a textbook DoS vector for users with many
   * messages.  Now delegates to a SQL GROUP BY query in the repository.
   */
  async getConversationList(userId: string): Promise<ConversationPartner[]> {
    const rows: ConversationRow[] = await messageRepository.findConversationList(userId);

    return rows.map(r => ({
      userId: r.partnerId,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      unreadCount: Number(r.unreadCount),
    }));
  }

  /**
   * Get total unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return messageRepository.countUnread(userId);
  }

  /**
   * Mark all messages from a sender as read
   */
  async markAsRead(userId: string, senderId: string): Promise<void> {
    await messageRepository.markAsRead(userId, senderId);
  }

  /**
   * Get list of users that the current user can message (paginated).
   * Admins see all active users; patients/doctors see only users they've had
   * a completed appointment with (on the other side of the relationship).
   */
  async getUsers(
    currentUserId: string,
    role: UserRole,
    page = 1,
    limit = 50
  ): Promise<{ users: EligiblePartnerRow[]; total: number }> {
    if (role === UserRole.ADMIN) {
      const result = await messageRepository.findActiveUsers(currentUserId, page, limit);
      return result as unknown as { users: EligiblePartnerRow[]; total: number };
    }
    return messageRepository.findEligiblePartners(currentUserId, role, page, limit);
  }
}

export const messageService = new MessageService();
