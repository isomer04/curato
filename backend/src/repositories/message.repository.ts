import { Op, QueryTypes } from 'sequelize';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { sequelize } from '../config/database';
import { AppointmentStatus } from '../types/constants';

export interface CreateMessageData {
  senderId: string;
  receiverId: string;
  content: string;
}

/** Shared user attributes included on sender / receiver associations. */
const userAttrs = ['id', 'firstName', 'lastName', 'role'];

const messageIncludes = [
  { model: User, as: 'sender', attributes: userAttrs },
  { model: User, as: 'receiver', attributes: userAttrs },
];

/** Shape of a raw message row returned by findConversation SQL query. */
interface RawMessageRow {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: number | boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  sId: string;
  sFirstName: string;
  sLastName: string;
  sRole: string;
  rId: string;
  rFirstName: string;
  rLastName: string;
  rRole: string;
}

/** Shape returned by the conversation-list raw SQL query. */
export interface ConversationRow {
  partnerId: string;
  firstName: string;
  lastName: string;
  role: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

class MessageRepository {
  async create(data: CreateMessageData): Promise<Message> {
    const msg = await Message.create(data as Message['_creationAttributes']);
    // Re-fetch with associations so the caller always gets a fully-hydrated record.
    return Message.findByPk(msg.id, { include: messageIncludes }) as Promise<Message>;
  }

  async findReceiverActive(
    receiverId: string
  ): Promise<{ id: string; isActive: boolean; role: string } | null> {
    return User.findByPk(receiverId, { attributes: ['id', 'isActive', 'role'] }) as Promise<{
      id: string;
      isActive: boolean;
      role: string;
    } | null>;
  }

  async findConversation(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: Message[]; total: number }> {
    const offset = (page - 1) * limit;
    // limit/offset are validated DTO integers — safe to inline to avoid MySQL2
    // quoting them as strings which makes `LIMIT '50'` a syntax error.
    const replacements = { userId, otherUserId };

    // Use raw SQL to avoid Sequelize v6's subquery-pagination strategy which
    // duplicates the ORDER BY into an outer query where the two users JOINs
    // create an ambiguous `created_at` column reference.
    const whereClause = `
      (
        (m.sender_id = :userId   AND m.receiver_id = :otherUserId) OR
        (m.sender_id = :otherUserId AND m.receiver_id = :userId)
      )
      AND m.deleted_at IS NULL
    `;

    const [countRows, rows] = await Promise.all([
      sequelize.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM messages m WHERE ${whereClause}`,
        { replacements, type: QueryTypes.SELECT }
      ),
      sequelize.query<RawMessageRow>(
        `SELECT
          m.id            AS id,
          m.sender_id     AS senderId,
          m.receiver_id   AS receiverId,
          m.content       AS content,
          m.is_read       AS isRead,
          m.read_at       AS readAt,
          m.created_at    AS createdAt,
          m.updated_at    AS updatedAt,
          s.id            AS sId,
          s.first_name    AS sFirstName,
          s.last_name     AS sLastName,
          s.role          AS sRole,
          r.id            AS rId,
          r.first_name    AS rFirstName,
          r.last_name     AS rLastName,
          r.role          AS rRole
        FROM messages m
        INNER JOIN users s ON s.id = m.sender_id
        INNER JOIN users r ON r.id = m.receiver_id
        WHERE ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
        { replacements, type: QueryTypes.SELECT }
      ),
    ]);

    const messages = rows.reverse().map(r => ({
      id: r.id,
      senderId: r.senderId,
      receiverId: r.receiverId,
      content: r.content,
      isRead: Boolean(r.isRead),
      readAt: r.readAt ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      sender: { id: r.sId, firstName: r.sFirstName, lastName: r.sLastName, role: r.sRole },
      receiver: { id: r.rId, firstName: r.rFirstName, lastName: r.rLastName, role: r.rRole },
    }));

    return { messages: messages as unknown as Message[], total: Number(countRows[0]?.total ?? 0) };
  }

  async markConversationAsRead(senderId: string, receiverId: string): Promise<void> {
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { senderId, receiverId, isRead: false } }
    );
  }

  /**
   * Get all conversation partners with last message and unread count.
   * Uses SQL GROUP BY + subqueries to avoid loading all messages into memory.
   * This replaces the old findAllForUser() which was an O(n) memory bomb.
   */
  async findConversationList(userId: string): Promise<ConversationRow[]> {
    // Compute the "partner" id per message, then group by partner.
    const results = await sequelize.query<ConversationRow>(
      `
      SELECT
        partner_id AS partnerId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.role,
        sub.content AS lastMessage,
        sub.last_message_at AS lastMessageAt,
        COALESCE(unread.cnt, 0) AS unreadCount
      FROM (
        SELECT
          CASE WHEN sender_id = :userId THEN receiver_id ELSE sender_id END AS partner_id,
          MAX(created_at) AS last_message_at
        FROM messages
        WHERE sender_id = :userId OR receiver_id = :userId
        GROUP BY partner_id
      ) grouped
      -- Get the actual last message content via a correlated subquery join
      JOIN LATERAL (
        SELECT content, created_at AS last_message_at
        FROM messages
        WHERE (
          (sender_id = :userId AND receiver_id = grouped.partner_id) OR
          (sender_id = grouped.partner_id AND receiver_id = :userId)
        )
        ORDER BY created_at DESC
        LIMIT 1
      ) sub ON TRUE
      JOIN users u ON u.id = grouped.partner_id
      -- Count unread messages from partner -> current user
      LEFT JOIN (
        SELECT sender_id, COUNT(*) AS cnt
        FROM messages
        WHERE receiver_id = :userId AND is_read = false
        GROUP BY sender_id
      ) unread ON unread.sender_id = grouped.partner_id
      ORDER BY sub.last_message_at DESC
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    );

    return results;
  }

  async countUnread(userId: string): Promise<number> {
    return Message.count({ where: { receiverId: userId, isRead: false } });
  }

  async markAsRead(receiverId: string, senderId: string): Promise<void> {
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { senderId, receiverId, isRead: false } }
    );
  }

  async findActiveUsers(
    currentUserId: string,
    page = 1,
    limit = 50
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where: {
        id: { [Op.ne]: currentUserId },
        isActive: true,
      },
      attributes: ['id', 'firstName', 'lastName', 'role', 'email'],
      order: [
        ['role', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit,
      offset,
    });
    return { users: rows, total: count };
  }

  /**
   * Return the distinct users a patient/doctor is allowed to message —
   * i.e. users on the other side of a completed appointment.
   * Patients see their doctors; doctors see their patients.
   */
  async findEligiblePartners(
    currentUserId: string,
    currentRole: string,
    page = 1,
    limit = 50
  ): Promise<{ users: EligiblePartnerRow[]; total: number }> {
    const offset = (page - 1) * limit;

    // Build the DISTINCT select based on role.
    // Patients → find doctor users from completed appointments.
    // Doctors  → find patient users from completed appointments.
    const innerSql =
      currentRole === 'patient'
        ? `
          SELECT DISTINCT u.id, u.first_name AS firstName, u.last_name AS lastName, u.role, u.email
          FROM appointments a
          INNER JOIN patients p  ON p.id = a.patient_id  AND p.deleted_at IS NULL
          INNER JOIN doctors  d  ON d.id = a.doctor_id   AND d.deleted_at IS NULL
          INNER JOIN users    u  ON u.id = d.user_id     AND u.is_active  = true
          WHERE p.user_id  = :userId
            AND a.status   = :completed
            AND a.deleted_at IS NULL
        `
        : `
          SELECT DISTINCT u.id, u.first_name AS firstName, u.last_name AS lastName, u.role, u.email
          FROM appointments a
          INNER JOIN doctors  d  ON d.id = a.doctor_id   AND d.deleted_at IS NULL
          INNER JOIN patients p  ON p.id = a.patient_id  AND p.deleted_at IS NULL
          INNER JOIN users    u  ON u.id = p.user_id     AND u.is_active  = true
          WHERE d.user_id  = :userId
            AND a.status   = :completed
            AND a.deleted_at IS NULL
        `;

    const replacements = { userId: currentUserId, completed: AppointmentStatus.COMPLETED };

    const [countRows, users] = await Promise.all([
      sequelize.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM (${innerSql}) AS eligible`,
        { replacements, type: QueryTypes.SELECT }
      ),
      sequelize.query<EligiblePartnerRow>(
        `${innerSql} ORDER BY firstName ASC LIMIT ${limit} OFFSET ${offset}`,
        { replacements, type: QueryTypes.SELECT }
      ),
    ]);

    return { users, total: Number(countRows[0]?.total ?? 0) };
  }
}

/** Shape returned by findEligiblePartners (and compatible with admin findActiveUsers). */
export interface EligiblePartnerRow {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

export const messageRepository = new MessageRepository();
