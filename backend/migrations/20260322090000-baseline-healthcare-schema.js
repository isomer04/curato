'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async tableName => {
      const tables = await queryInterface.showAllTables();
      const normalized = tables.map(table =>
        typeof table === 'string' ? table : table.tableName || table.table_name
      );
      return normalized.includes(tableName);
    };

    // users
    if (!(await tableExists('users'))) {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        role: {
          type: Sequelize.ENUM('patient', 'doctor', 'admin'),
          allowNull: false,
          defaultValue: 'patient',
        },
        first_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        last_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        phone_number: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        is_email_verified: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        last_login_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        refresh_token: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        login_attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        lockout_until: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        mfa_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        mfa_secret: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        mfa_temp_token_hash: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        password_reset_token_hash: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        password_reset_expires_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        email_verification_token_hash: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('users', ['role']);
      await queryInterface.addIndex('users', ['is_active']);
      await queryInterface.addIndex('users', ['password_reset_token_hash'], {
        name: 'idx_users_password_reset_token_hash',
      });
      await queryInterface.addIndex('users', ['email_verification_token_hash'], {
        name: 'idx_users_email_verification_token_hash',
      });
    }

    // patients
    if (!(await tableExists('patients'))) {
      await queryInterface.createTable('patients', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        date_of_birth: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        gender: {
          type: Sequelize.ENUM('male', 'female', 'other'),
          allowNull: false,
        },
        blood_group: {
          type: Sequelize.STRING(5),
          allowNull: true,
        },
        allergies: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        emergency_contact_name: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        emergency_contact_phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        address: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        insurance_info: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('patients', ['date_of_birth']);
      await queryInterface.addIndex('patients', ['gender']);
    }

    // doctors
    if (!(await tableExists('doctors'))) {
      await queryInterface.createTable('doctors', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        specialization: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        license_number: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        years_of_experience: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        consultation_fee: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        bio: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        qualifications: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        languages: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: ['English'],
        },
        rating: {
          type: Sequelize.DECIMAL(2, 1),
          allowNull: false,
          defaultValue: 0,
        },
        total_patients: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('doctors', ['specialization']);
      await queryInterface.addIndex('doctors', ['rating']);
    }

    // appointments
    if (!(await tableExists('appointments'))) {
      await queryInterface.createTable('appointments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'patients', key: 'id' },
          onUpdate: 'CASCADE',
          // HIPAA §164.530(j): Appointments are clinical records that must be
          // retained for ≥6 years. RESTRICT ensures a hard-delete of a patient
          // cannot silently cascade and destroy appointment history.
          onDelete: 'RESTRICT',
        },
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'doctors', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        appointment_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        start_time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        end_time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'),
          allowNull: false,
          defaultValue: 'scheduled',
        },
        reason_for_visit: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        prescriptions: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        cancelled_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        cancellation_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('appointments', ['patient_id']);
      await queryInterface.addIndex('appointments', ['doctor_id']);
      await queryInterface.addIndex('appointments', ['appointment_date']);
      await queryInterface.addIndex('appointments', ['status']);
      await queryInterface.addIndex(
        'appointments',
        ['doctor_id', 'appointment_date', 'start_time'],
        { name: 'uq_appt_doctor_date_start', unique: true }
      );
    }

    // doctor_availability
    if (!(await tableExists('doctor_availability'))) {
      await queryInterface.createTable('doctor_availability', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'doctors', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        day_of_week: {
          type: Sequelize.ENUM(
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
          ),
          allowNull: false,
        },
        start_time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        end_time: {
          type: Sequelize.TIME,
          allowNull: false,
        },
        slot_duration: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 30,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        effective_from: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        effective_to: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('doctor_availability', ['doctor_id']);
      await queryInterface.addIndex('doctor_availability', ['day_of_week']);
      await queryInterface.addIndex('doctor_availability', ['is_active']);
      await queryInterface.addIndex(
        'doctor_availability',
        ['doctor_id', 'day_of_week', 'start_time', 'effective_from'],
        { name: 'uq_avail_doctor_day_start_from', unique: true }
      );
    }

    // medical_records
    if (!(await tableExists('medical_records'))) {
      await queryInterface.createTable('medical_records', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'patients', key: 'id' },
          onUpdate: 'CASCADE',
          // HIPAA §164.530(j): medical_records must survive patient hard-deletes.
          onDelete: 'RESTRICT',
        },
        doctor_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'doctors', key: 'id' },
          onUpdate: 'CASCADE',
          // A doctor leaving should not silently destroy clinical PHI.
          onDelete: 'RESTRICT',
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'appointments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        record_type: {
          type: Sequelize.ENUM('consultation', 'diagnosis', 'lab_result', 'prescription'),
          allowNull: false,
        },
        diagnosis: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        symptoms: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        prescriptions: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        lab_results: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        attachments: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_confidential: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('medical_records', ['patient_id']);
      await queryInterface.addIndex('medical_records', ['doctor_id']);
      await queryInterface.addIndex('medical_records', ['appointment_id']);
      await queryInterface.addIndex('medical_records', ['record_type']);
      await queryInterface.addIndex('medical_records', ['created_at']);
    }

    // notifications
    if (!(await tableExists('notifications'))) {
      await queryInterface.createTable('notifications', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        type: {
          type: Sequelize.ENUM(
            'appointment_reminder',
            'appointment_cancelled',
            'appointment_confirmed',
            'new_message'
          ),
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {},
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        read_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });

      await queryInterface.addIndex('notifications', ['user_id']);
      await queryInterface.addIndex('notifications', ['is_read']);
      await queryInterface.addIndex('notifications', ['type']);
      await queryInterface.addIndex('notifications', ['created_at']);
    }

    // messages
    if (!(await tableExists('messages'))) {
      await queryInterface.createTable('messages', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sender_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        receiver_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        is_read: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        read_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('messages', ['sender_id']);
      await queryInterface.addIndex('messages', ['receiver_id']);
      // Composite index for the dominant conversation query:
      // WHERE (sender_id = A AND receiver_id = B) OR (sender_id = B AND receiver_id = A)
      // Single-column indexes do not satisfy this efficiently.
      await queryInterface.addIndex('messages', ['sender_id', 'receiver_id'], {
        name: 'idx_messages_sender_receiver',
      });
      await queryInterface.addIndex('messages', ['is_read']);
      await queryInterface.addIndex('messages', ['created_at']);
    }

    // insurances
    if (!(await tableExists('insurances'))) {
      await queryInterface.createTable('insurances', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'patients', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        provider_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        policy_number: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        group_number: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        subscriber_name: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        subscriber_relation: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'self',
        },
        plan_type: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        coverage_start_date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        coverage_end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        copay_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        },
        deductible_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        },
        deductible_met: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        },
        verification_status: {
          type: Sequelize.ENUM('pending', 'verified', 'rejected', 'expired'),
          allowNull: false,
          defaultValue: 'pending',
        },
        verification_date: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        verification_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('insurances', ['patient_id']);
      // Composite unique: a patient should not have two records with the same policy number.
      await queryInterface.addIndex('insurances', ['patient_id', 'policy_number'], {
        name: 'uq_insurance_patient_policy',
        unique: true,
      });
      await queryInterface.addIndex('insurances', ['verification_status']);
      await queryInterface.addIndex('insurances', ['is_active']);
    }

    // phi_audit_logs
    if (!(await tableExists('phi_audit_logs'))) {
      await queryInterface.createTable('phi_audit_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        actor_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        actor_role: {
          type: Sequelize.ENUM('patient', 'doctor', 'admin'),
          allowNull: true,
        },
        action: {
          type: Sequelize.ENUM(
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
            // Messaging PHI actions — required for HIPAA audit compliance.
            // Previously missing: inserting these actions threw a DB ENUM error.
            'view_messages',
            'send_message',
            // Insurance PHI actions
            'view_insurance',
            'modify_insurance'
          ),
          allowNull: false,
        },
        resource_type: {
          type: Sequelize.ENUM(
            'medical_record',
            'appointment',
            'patient_profile',
            // Previously missing resource types — caused silent audit gaps for
            // message and insurance PHI access.
            'message',
            'insurance'
          ),
          allowNull: false,
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        resource_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
        },
        user_agent: {
          type: Sequelize.STRING(512),
          allowNull: true,
        },
        outcome: {
          type: Sequelize.ENUM('success', 'failure'),
          allowNull: false,
        },
        details: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      await queryInterface.addIndex('phi_audit_logs', ['patient_id']);
      await queryInterface.addIndex('phi_audit_logs', ['actor_id']);
      await queryInterface.addIndex('phi_audit_logs', ['action']);
      await queryInterface.addIndex('phi_audit_logs', ['created_at']);
    }
  },

  async down(queryInterface) {
    const tableExists = async tableName => {
      const tables = await queryInterface.showAllTables();
      const normalized = tables.map(table =>
        typeof table === 'string' ? table : table.tableName || table.table_name
      );
      return normalized.includes(tableName);
    };

    const dropIfExists = async tableName => {
      if (await tableExists(tableName)) {
        await queryInterface.dropTable(tableName);
      }
    };

    await dropIfExists('phi_audit_logs');
    await dropIfExists('insurances');
    await dropIfExists('messages');
    await dropIfExists('notifications');
    await dropIfExists('medical_records');
    await dropIfExists('doctor_availability');
    await dropIfExists('appointments');
    await dropIfExists('doctors');
    await dropIfExists('patients');
    await dropIfExists('users');
  },
};
