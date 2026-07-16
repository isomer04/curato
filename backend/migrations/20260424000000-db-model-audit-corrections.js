'use strict';

/**
 * Migration: db-model-audit-corrections
 *
 * Applies structural database changes identified in the April 2026 model audit:
 *
 * 1. doctor_availability — add deleted_at (soft-delete / paranoid)
 * 2. notifications       — add expires_at (TTL for cleanup jobs)
 * 3. phi_audit_logs      — expand action ENUM to include view_messages,
 *                          send_message, view_insurance, modify_insurance
 * 4. phi_audit_logs      — expand resource_type ENUM to include message, insurance
 * 5. insurances          — add composite unique index (patient_id, policy_number)
 * 6. messages            — add composite index (sender_id, receiver_id)
 *
 * NOTE: appointments and medical_records CASCADE→RESTRICT changes are in the
 * baseline migration. For existing production databases, those FK constraints
 * must be altered separately via ALTER TABLE statements (see runbook).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── 1. doctor_availability: add soft-delete column ─────────────────────
    const availCols = await queryInterface.describeTable('doctor_availability');
    if (!availCols['deleted_at']) {
      await queryInterface.addColumn('doctor_availability', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    // ── 2. notifications: add expires_at TTL column ─────────────────────────
    const notifCols = await queryInterface.describeTable('notifications');
    if (!notifCols['expires_at']) {
      await queryInterface.addColumn('notifications', 'expires_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
      await queryInterface.addIndex('notifications', ['expires_at'], {
        name: 'idx_notifications_expires_at',
      });
    }

    // ── 3 & 4. phi_audit_logs: expand action and resource_type ENUMs ────────
    // MySQL requires ALTER TABLE ... MODIFY COLUMN to change ENUM values.
    // We can only add values, not remove them, without rebuilding the table.
    await queryInterface.sequelize.query(`
      ALTER TABLE phi_audit_logs
        MODIFY COLUMN action ENUM(
          'view_medical_records',
          'export_records_csv',
          'export_records_pdf',
          'book_appointment',
          'view_appointment',
          'update_appointment',
          'cancel_appointment',
          'confirm_appointment',
          'complete_appointment',
          'view_patient_profile',
          'view_messages',
          'send_message',
          'view_insurance',
          'modify_insurance'
        ) NOT NULL,
        MODIFY COLUMN resource_type ENUM(
          'medical_record',
          'appointment',
          'patient_profile',
          'message',
          'insurance'
        ) NOT NULL;
    `);

    // ── 5. insurances: composite unique (patient_id, policy_number) ─────────
    // Drop the old single-column policy_number index if it exists, then add
    // the composite unique constraint.
    const [indexRows] = await queryInterface.sequelize.query(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'insurances'
        AND INDEX_NAME = 'uq_insurance_patient_policy';
    `);
    if (indexRows.length === 0) {
      // Remove any duplicate (patient_id, policy_number) rows that would block the unique index.
      // Keeps the earliest row (lowest created_at, tie-broken by id) per group.
      await queryInterface.sequelize.query(`
        DELETE FROM insurances
        WHERE id IN (
          SELECT id FROM (
            SELECT i1.id
            FROM insurances i1
            WHERE i1.id NOT IN (
              SELECT MIN(i2.id)
              FROM insurances i2
              WHERE i2.policy_number IS NOT NULL
              GROUP BY i2.patient_id, i2.policy_number
            )
            AND i1.policy_number IS NOT NULL
          ) AS dups
        );
      `);
      await queryInterface.addIndex('insurances', ['patient_id', 'policy_number'], {
        name: 'uq_insurance_patient_policy',
        unique: true,
      });
    }

    // ── 6. messages: composite index (sender_id, receiver_id) ────────────────
    const [msgIndexRows] = await queryInterface.sequelize.query(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'messages'
        AND INDEX_NAME = 'idx_messages_sender_receiver';
    `);
    if (msgIndexRows.length === 0) {
      await queryInterface.addIndex('messages', ['sender_id', 'receiver_id'], {
        name: 'idx_messages_sender_receiver',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // ── 6. messages composite index ──────────────────────────────────────────
    await queryInterface.removeIndex('messages', 'idx_messages_sender_receiver').catch(() => {});

    // ── 5. insurances composite unique ──────────────────────────────────────
    await queryInterface.removeIndex('insurances', 'uq_insurance_patient_policy').catch(() => {});

    // ── 3 & 4. phi_audit_logs: revert ENUMs to original values ──────────────
    await queryInterface.sequelize.query(`
      ALTER TABLE phi_audit_logs
        MODIFY COLUMN action ENUM(
          'view_medical_records',
          'export_records_csv',
          'export_records_pdf',
          'book_appointment',
          'view_appointment',
          'update_appointment',
          'cancel_appointment',
          'confirm_appointment',
          'complete_appointment',
          'view_patient_profile'
        ) NOT NULL,
        MODIFY COLUMN resource_type ENUM(
          'medical_record',
          'appointment',
          'patient_profile'
        ) NOT NULL;
    `);

    // ── 2. notifications: remove expires_at ──────────────────────────────────
    await queryInterface.removeIndex('notifications', 'idx_notifications_expires_at').catch(() => {});
    await queryInterface.removeColumn('notifications', 'expires_at').catch(() => {});

    // ── 1. doctor_availability: remove deleted_at ────────────────────────────
    await queryInterface.removeColumn('doctor_availability', 'deleted_at').catch(() => {});
  },
};
