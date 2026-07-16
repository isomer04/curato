'use strict';

/**
 * Migration: Add soft deletes, doctor approval, and encrypted insurance info.
 *
 * Changes:
 * 1. Add `deleted_at` (DATETIME) to tables with paranoid: true
 *    (patients, appointments, medical_records, doctors, messages, insurances)
 * 2. Add `is_approved` (BOOLEAN, default false) to doctors table
 * 3. Change `insurance_info` column in patients from JSON to TEXT
 *    (required for AES-256-GCM encrypted ciphertext storage)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add deleted_at to all HIPAA-sensitive tables for soft deletes
    const paranoidTables = [
      'patients',
      'appointments',
      'medical_records',
      'doctors',
      'messages',
      'insurances',
    ];

    for (const table of paranoidTables) {
      await queryInterface.addColumn(table, 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      });
    }

    // 2. Add is_approved to doctors table
    await queryInterface.addColumn('doctors', 'is_approved', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Approve all existing doctors so they are not locked out
    await queryInterface.sequelize.query(
      'UPDATE doctors SET is_approved = true WHERE is_approved = false'
    );

    // 3. Change insurance_info column from JSON to TEXT for encrypted storage
    await queryInterface.changeColumn('patients', 'insurance_info', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse: change insurance_info back to JSON
    await queryInterface.changeColumn('patients', 'insurance_info', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    // Remove is_approved from doctors
    await queryInterface.removeColumn('doctors', 'is_approved');

    // Remove deleted_at from all tables
    const paranoidTables = [
      'patients',
      'appointments',
      'medical_records',
      'doctors',
      'messages',
      'insurances',
    ];

    for (const table of paranoidTables) {
      await queryInterface.removeColumn(table, 'deleted_at');
    }
  },
};
