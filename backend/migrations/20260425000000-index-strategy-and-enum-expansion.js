'use strict';

/**
 * Migration: index-strategy-and-enum-expansion
 *
 * Applies changes identified in the April 2026 model audit follow-up:
 *
 * INDEX STRATEGY (Findings #5 + #6)
 * 1. users            — drop low-cardinality is_active standalone index
 * 2. patients         — drop low-cardinality gender standalone index
 * 3. messages         — drop low-cardinality is_read standalone index
 *                       add composite (receiver_id, is_read, created_at) for inbox queries
 * 4. insurances       — drop low-cardinality is_active standalone index
 *                       add composite (patient_id, is_active, coverage_end_date)
 * 5. notifications    — drop low-cardinality is_read standalone index
 *                       add composite (user_id, is_read, created_at) for inbox queries
 * 6. medical_records  — drop low-cardinality record_type standalone index
 *                       add composite (patient_id, record_type, created_at)
 * 7. doctor_availability — drop low-cardinality is_active standalone index
 *                          add composite (doctor_id, day_of_week, is_active)
 *
 * ENUM EXPANSION (Finding #17)
 * 8. medical_records  — expand record_type ENUM to add surgery, vaccination, other
 *                       (these values existed in the frontend model but not the backend,
 *                        causing the API contract to advertise values the DB rejected)
 *
 * NOTE ON FK CONSTRAINTS (Finding #4)
 * The onDelete rules added to Sequelize association definitions in index.ts are ORM-layer
 * documentation. The underlying FK constraints were already created with MySQL's implicit
 * RESTRICT default in the baseline migration, so no ALTER TABLE is needed for RESTRICT
 * associations. The Notification CASCADE requires a separate ALTER TABLE if hard-delete
 * cascading at the DB level is desired (soft-delete via paranoid covers normal operation).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper: drop an index only if it exists, identified by column set
    const dropIndexIfExists = async (table, indexName) => {
      const [rows] = await queryInterface.sequelize.query(`
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?;
      `, { replacements: [table, indexName] });
      if (rows.length > 0) {
        await queryInterface.removeIndex(table, indexName);
      }
    };

    const addIndexIfMissing = async (table, fields, options = {}) => {
      const indexName = options.name || `${table}_${fields.join('_')}`;
      const [rows] = await queryInterface.sequelize.query(`
        SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?;
      `, { replacements: [table, indexName] });
      if (rows.length === 0) {
        await queryInterface.addIndex(table, fields, options);
      }
    };

    // ── 1. users: drop is_active standalone index ────────────────────────────
    // Boolean column with 2 possible values — MySQL optimizer ignores it.
    // Sequelize auto-names this index as 'users_is_active'.
    await dropIndexIfExists('users', 'users_is_active');

    // ── 2. patients: drop gender standalone index ────────────────────────────
    // Enum with 3 values (male/female/other) — too low-cardinality to be selective.
    await dropIndexIfExists('patients', 'patients_gender');

    // ── 3. messages: drop is_read standalone, add composite ──────────────────
    await dropIndexIfExists('messages', 'messages_is_read');
    await addIndexIfMissing('messages', ['receiver_id', 'is_read', 'created_at'], {
      name: 'idx_messages_receiver_read_created',
    });

    // ── 4. insurances: drop is_active standalone, add composite ─────────────
    await dropIndexIfExists('insurances', 'insurances_is_active');
    await addIndexIfMissing('insurances', ['patient_id', 'is_active', 'coverage_end_date'], {
      name: 'idx_insurance_patient_active_end',
    });

    // ── 5. notifications: drop is_read standalone, add composite ─────────────
    await dropIndexIfExists('notifications', 'notifications_is_read');
    await addIndexIfMissing('notifications', ['user_id', 'is_read', 'created_at'], {
      name: 'idx_notifications_user_read_created',
    });

    // ── 6. medical_records: drop record_type standalone, add composite ───────
    // record_type has ≤7 values — standalone index is not selective. The composite
    // (patient_id, record_type, created_at) covers the dominant query pattern.
    await dropIndexIfExists('medical_records', 'medical_records_record_type');
    await addIndexIfMissing('medical_records', ['patient_id', 'record_type', 'created_at'], {
      name: 'idx_medical_records_patient_type_created',
    });

    // ── 7. doctor_availability: drop is_active standalone, add composite ─────
    await dropIndexIfExists('doctor_availability', 'doctor_availability_is_active');
    await addIndexIfMissing('doctor_availability', ['doctor_id', 'day_of_week', 'is_active'], {
      name: 'idx_avail_doctor_day_active',
    });

    // ── 8. medical_records: expand record_type ENUM ──────────────────────────
    // MySQL ENUM expansion requires MODIFY COLUMN with the full new value list.
    // Existing rows are unaffected — MySQL only validates new inserts/updates.
    await queryInterface.sequelize.query(`
      ALTER TABLE medical_records
        MODIFY COLUMN record_type ENUM(
          'consultation',
          'diagnosis',
          'lab_result',
          'prescription',
          'surgery',
          'vaccination',
          'other'
        ) NOT NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // ── 8. medical_records: revert record_type ENUM ──────────────────────────
    // WARNING: this will fail if any rows already have surgery/vaccination/other values.
    await queryInterface.sequelize.query(`
      ALTER TABLE medical_records
        MODIFY COLUMN record_type ENUM(
          'consultation',
          'diagnosis',
          'lab_result',
          'prescription'
        ) NOT NULL;
    `);

    // ── 7. doctor_availability ──────────────────────────────────────────────
    await queryInterface.removeIndex('doctor_availability', 'idx_avail_doctor_day_active').catch(() => {});
    await queryInterface.addIndex('doctor_availability', ['is_active'], { name: 'doctor_availability_is_active' });

    // ── 6. medical_records ───────────────────────────────────────────────────
    await queryInterface.removeIndex('medical_records', 'idx_medical_records_patient_type_created').catch(() => {});
    await queryInterface.addIndex('medical_records', ['record_type'], { name: 'medical_records_record_type' });

    // ── 5. notifications ─────────────────────────────────────────────────────
    await queryInterface.removeIndex('notifications', 'idx_notifications_user_read_created').catch(() => {});
    await queryInterface.addIndex('notifications', ['is_read'], { name: 'notifications_is_read' });

    // ── 4. insurances ────────────────────────────────────────────────────────
    await queryInterface.removeIndex('insurances', 'idx_insurance_patient_active_end').catch(() => {});
    await queryInterface.addIndex('insurances', ['is_active'], { name: 'insurances_is_active' });

    // ── 3. messages ──────────────────────────────────────────────────────────
    await queryInterface.removeIndex('messages', 'idx_messages_receiver_read_created').catch(() => {});
    await queryInterface.addIndex('messages', ['is_read'], { name: 'messages_is_read' });

    // ── 2. patients ──────────────────────────────────────────────────────────
    await queryInterface.addIndex('patients', ['gender'], { name: 'patients_gender' });

    // ── 1. users ─────────────────────────────────────────────────────────────
    await queryInterface.addIndex('users', ['is_active'], { name: 'users_is_active' });
  },
};
