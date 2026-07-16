'use strict';

/**
 * Migration: normalize-json-columns
 *
 * Phase 2 of the April 2026 model audit — replaces all JSON column abuse
 * with proper normalized child tables (Findings #1, #3, #10).
 *
 * CREATES 7 CHILD TABLES
 *   patient_allergies      — replaces patients.allergies (JSON)
 *   doctor_qualifications  — replaces doctors.qualifications (JSON)
 *   doctor_languages       — replaces doctors.languages (JSON)
 *   symptoms               — replaces medical_records.symptoms (JSON)
 *   prescriptions          — replaces medical_records.prescriptions (JSON)
 *                            and appointments.prescriptions (JSON)
 *   lab_results            — replaces medical_records.lab_results (JSON)
 *   medical_attachments    — replaces medical_records.attachments (JSON)
 *
 * DATA MIGRATION
 *   Existing JSON array content is unpacked to child rows before the source
 *   columns are dropped. Empty / null / malformed arrays are skipped safely.
 *
 * COLUMN CHANGES
 *   patients.address          JSON → TEXT  (AES-256-GCM getter handles both
 *                             encrypted text and legacy plaintext JSON in reads)
 *   patients.insurance_info   DROPPED  (canonical source: insurances table)
 *   patients.allergies        DROPPED  (migrated → patient_allergies)
 *   doctors.qualifications    DROPPED  (migrated → doctor_qualifications)
 *   doctors.languages         DROPPED  (migrated → doctor_languages)
 *   medical_records.symptoms        DROPPED  (migrated → symptoms)
 *   medical_records.prescriptions   DROPPED  (migrated → prescriptions)
 *   medical_records.lab_results     DROPPED  (migrated → lab_results)
 *   medical_records.attachments     DROPPED  (migrated → medical_attachments)
 *   appointments.prescriptions      DROPPED  (prescriptions live on MedicalRecord)
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async tableName => {
      const tables = await queryInterface.showAllTables();
      const normalized = tables.map(t =>
        typeof t === 'string' ? t : t.tableName || t.table_name
      );
      return normalized.includes(tableName);
    };

    const columnExists = async (table, column) => {
      const cols = await queryInterface.describeTable(table);
      return Object.prototype.hasOwnProperty.call(cols, column);
    };

    // ─── 1. CREATE CHILD TABLES ─────────────────────────────────────────────

    if (!(await tableExists('patient_allergies'))) {
      await queryInterface.createTable('patient_allergies', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
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
        allergy_name: { type: Sequelize.STRING(200), allowNull: false },
        severity: {
          type: Sequelize.ENUM('mild', 'moderate', 'severe'),
          allowNull: true,
        },
        noted_date: { type: Sequelize.DATEONLY, allowNull: true },
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
      await queryInterface.addIndex('patient_allergies', ['patient_id']);
    }

    if (!(await tableExists('doctor_qualifications'))) {
      await queryInterface.createTable('doctor_qualifications', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
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
        degree: { type: Sequelize.STRING(200), allowNull: false },
        institution: { type: Sequelize.STRING(300), allowNull: false },
        year: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
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
      await queryInterface.addIndex('doctor_qualifications', ['doctor_id']);
    }

    if (!(await tableExists('doctor_languages'))) {
      await queryInterface.createTable('doctor_languages', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
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
        language: { type: Sequelize.STRING(100), allowNull: false },
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
      await queryInterface.addIndex('doctor_languages', ['doctor_id']);
      await queryInterface.addIndex('doctor_languages', ['doctor_id', 'language'], {
        name: 'uq_doctor_language',
        unique: true,
      });
    }

    if (!(await tableExists('symptoms'))) {
      await queryInterface.createTable('symptoms', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
          primaryKey: true,
          allowNull: false,
        },
        medical_record_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'medical_records', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        symptom_name: { type: Sequelize.STRING(300), allowNull: false },
        severity: {
          type: Sequelize.ENUM('mild', 'moderate', 'severe'),
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
      await queryInterface.addIndex('symptoms', ['medical_record_id']);
    }

    if (!(await tableExists('prescriptions'))) {
      await queryInterface.createTable('prescriptions', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
          primaryKey: true,
          allowNull: false,
        },
        medical_record_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'medical_records', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        medication: { type: Sequelize.STRING(300), allowNull: false },
        dosage: { type: Sequelize.STRING(100), allowNull: false },
        frequency: { type: Sequelize.STRING(100), allowNull: false },
        duration: { type: Sequelize.STRING(100), allowNull: false },
        start_date: { type: Sequelize.DATEONLY, allowNull: true },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        instructions: { type: Sequelize.TEXT, allowNull: true },
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
      await queryInterface.addIndex('prescriptions', ['medical_record_id']);
    }

    if (!(await tableExists('lab_results'))) {
      await queryInterface.createTable('lab_results', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
          primaryKey: true,
          allowNull: false,
        },
        medical_record_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'medical_records', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        test_name: { type: Sequelize.STRING(300), allowNull: false },
        result: { type: Sequelize.STRING(500), allowNull: false },
        normal_range: { type: Sequelize.STRING(200), allowNull: true },
        unit: { type: Sequelize.STRING(50), allowNull: true },
        tested_at: { type: Sequelize.DATEONLY, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
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
      await queryInterface.addIndex('lab_results', ['medical_record_id']);
    }

    if (!(await tableExists('medical_attachments'))) {
      await queryInterface.createTable('medical_attachments', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('(UUID())'),
          primaryKey: true,
          allowNull: false,
        },
        medical_record_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'medical_records', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        storage_key: { type: Sequelize.STRING(1000), allowNull: false },
        filename: { type: Sequelize.STRING(500), allowNull: false },
        mime_type: { type: Sequelize.STRING(100), allowNull: false },
        uploaded_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
      await queryInterface.addIndex('medical_attachments', ['medical_record_id']);
    }

    // ─── 2. DATA MIGRATION: unpack JSON arrays → child rows ────────────────
    // Uses MySQL UUID() for child IDs so we don't pull rows into Node.

    // patient_allergies — string array e.g. ["Penicillin", "Peanuts"]
    if (await columnExists('patients', 'allergies')) {
      const [patientRows] = await queryInterface.sequelize.query(
        `SELECT id, allergies FROM patients
         WHERE allergies IS NOT NULL AND JSON_LENGTH(allergies) > 0`
      );
      for (const row of patientRows) {
        let items;
        try {
          items = typeof row.allergies === 'string'
            ? JSON.parse(row.allergies)
            : row.allergies;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const name of items) {
          if (typeof name !== 'string' || !name.trim()) continue;
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO patient_allergies
               (id, patient_id, allergy_name, created_at, updated_at)
             VALUES (UUID(), :patientId, :name, NOW(), NOW())`,
            { replacements: { patientId: row.id, name: name.trim() } }
          );
        }
      }
    }

    // doctor_languages — string array e.g. ["English", "Spanish"]
    if (await columnExists('doctors', 'languages')) {
      const [doctorRows] = await queryInterface.sequelize.query(
        `SELECT id, languages FROM doctors
         WHERE languages IS NOT NULL AND JSON_LENGTH(languages) > 0`
      );
      for (const row of doctorRows) {
        let items;
        try {
          items = typeof row.languages === 'string'
            ? JSON.parse(row.languages)
            : row.languages;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const lang of items) {
          if (typeof lang !== 'string' || !lang.trim()) continue;
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO doctor_languages
               (id, doctor_id, language, created_at, updated_at)
             VALUES (UUID(), :doctorId, :lang, NOW(), NOW())`,
            { replacements: { doctorId: row.id, lang: lang.trim() } }
          );
        }
      }
    }

    // doctor_qualifications — object array e.g. [{degree, institution, year}]
    if (await columnExists('doctors', 'qualifications')) {
      const [doctorRows] = await queryInterface.sequelize.query(
        `SELECT id, qualifications FROM doctors
         WHERE qualifications IS NOT NULL AND JSON_LENGTH(qualifications) > 0`
      );
      for (const row of doctorRows) {
        let items;
        try {
          items = typeof row.qualifications === 'string'
            ? JSON.parse(row.qualifications)
            : row.qualifications;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const q of items) {
          if (!q || typeof q !== 'object') continue;
          const year = parseInt(q.year, 10);
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO doctor_qualifications
               (id, doctor_id, degree, institution, year, created_at, updated_at)
             VALUES (UUID(), :doctorId, :degree, :institution, :year, NOW(), NOW())`,
            {
              replacements: {
                doctorId: row.id,
                degree: String(q.degree || '').trim() || 'Unknown',
                institution: String(q.institution || '').trim() || 'Unknown',
                year: Number.isFinite(year) ? year : new Date().getFullYear(),
              },
            }
          );
        }
      }
    }

    // symptoms — string or {name, severity} array
    if (await columnExists('medical_records', 'symptoms')) {
      const [recordRows] = await queryInterface.sequelize.query(
        `SELECT id, symptoms FROM medical_records
         WHERE symptoms IS NOT NULL AND JSON_LENGTH(symptoms) > 0`
      );
      for (const row of recordRows) {
        let items;
        try {
          items = typeof row.symptoms === 'string'
            ? JSON.parse(row.symptoms)
            : row.symptoms;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const s of items) {
          const name =
            typeof s === 'string'
              ? s.trim()
              : s && typeof s === 'object'
              ? String(s.name || s.symptomName || '').trim()
              : '';
          if (!name) continue;
          const severity =
            s && typeof s === 'object' && ['mild', 'moderate', 'severe'].includes(s.severity)
              ? s.severity
              : null;
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO symptoms
               (id, medical_record_id, symptom_name, severity, created_at, updated_at)
             VALUES (UUID(), :recordId, :name, :severity, NOW(), NOW())`,
            { replacements: { recordId: row.id, name, severity } }
          );
        }
      }
    }

    // prescriptions — {medication, dosage, frequency, duration, instructions?} array
    if (await columnExists('medical_records', 'prescriptions')) {
      const [recordRows] = await queryInterface.sequelize.query(
        `SELECT id, prescriptions FROM medical_records
         WHERE prescriptions IS NOT NULL AND JSON_LENGTH(prescriptions) > 0`
      );
      for (const row of recordRows) {
        let items;
        try {
          items = typeof row.prescriptions === 'string'
            ? JSON.parse(row.prescriptions)
            : row.prescriptions;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const p of items) {
          if (!p || typeof p !== 'object') continue;
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO prescriptions
               (id, medical_record_id, medication, dosage, frequency, duration, instructions, created_at, updated_at)
             VALUES (UUID(), :recordId, :medication, :dosage, :frequency, :duration, :instructions, NOW(), NOW())`,
            {
              replacements: {
                recordId: row.id,
                medication: String(p.medication || '').trim() || 'Unknown',
                dosage: String(p.dosage || '').trim() || 'Unknown',
                frequency: String(p.frequency || '').trim() || 'Unknown',
                duration: String(p.duration || '').trim() || 'Unknown',
                instructions: p.instructions ? String(p.instructions).trim() : null,
              },
            }
          );
        }
      }
    }

    // lab_results — {testName, result, normalRange?, unit?, testedAt?, notes?} array
    if (await columnExists('medical_records', 'lab_results')) {
      const [recordRows] = await queryInterface.sequelize.query(
        `SELECT id, lab_results FROM medical_records
         WHERE lab_results IS NOT NULL AND JSON_LENGTH(lab_results) > 0`
      );
      for (const row of recordRows) {
        let items;
        try {
          items = typeof row.lab_results === 'string'
            ? JSON.parse(row.lab_results)
            : row.lab_results;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const r of items) {
          if (!r || typeof r !== 'object') continue;
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO lab_results
               (id, medical_record_id, test_name, result, normal_range, unit, tested_at, notes, created_at, updated_at)
             VALUES (UUID(), :recordId, :testName, :result, :normalRange, :unit, :testedAt, :notes, NOW(), NOW())`,
            {
              replacements: {
                recordId: row.id,
                testName: String(r.testName || r.test_name || '').trim() || 'Unknown',
                result: String(r.result || '').trim() || 'Unknown',
                normalRange: r.normalRange || r.normal_range || null,
                unit: r.unit || null,
                testedAt: r.testedAt || r.tested_at || null,
                notes: r.notes || null,
              },
            }
          );
        }
      }
    }

    // medical_attachments — {storageKey, filename, mimeType} array
    if (await columnExists('medical_records', 'attachments')) {
      const [recordRows] = await queryInterface.sequelize.query(
        `SELECT id, attachments FROM medical_records
         WHERE attachments IS NOT NULL AND JSON_LENGTH(attachments) > 0`
      );
      for (const row of recordRows) {
        let items;
        try {
          items = typeof row.attachments === 'string'
            ? JSON.parse(row.attachments)
            : row.attachments;
        } catch {
          continue;
        }
        if (!Array.isArray(items)) continue;
        for (const a of items) {
          if (!a || typeof a !== 'object') continue;
          await queryInterface.sequelize.query(
            `INSERT IGNORE INTO medical_attachments
               (id, medical_record_id, storage_key, filename, mime_type, uploaded_at, created_at, updated_at)
             VALUES (UUID(), :recordId, :storageKey, :filename, :mimeType, NOW(), NOW(), NOW())`,
            {
              replacements: {
                recordId: row.id,
                storageKey: String(a.storageKey || a.storage_key || a.url || a.key || '').trim() || 'unknown',
                filename: String(a.filename || a.name || '').trim() || 'unknown',
                mimeType: String(a.mimeType || a.mime_type || 'application/octet-stream').trim(),
              },
            }
          );
        }
      }
    }

    // ─── 3. ALTER patients.address JSON → TEXT ──────────────────────────────
    // The ORM getter checks isEncrypted() first, so legacy plaintext JSON rows
    // remain readable without a backfill. New writes are AES-256-GCM encrypted.
    if (await columnExists('patients', 'address')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE patients MODIFY COLUMN address TEXT NULL`
      );
    }

    // ─── 4. DROP OBSOLETE COLUMNS ───────────────────────────────────────────

    const dropIfExists = async (table, column) => {
      if (await columnExists(table, column)) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await dropIfExists('patients', 'insurance_info');
    await dropIfExists('patients', 'allergies');
    await dropIfExists('doctors', 'qualifications');
    await dropIfExists('doctors', 'languages');
    await dropIfExists('medical_records', 'symptoms');
    await dropIfExists('medical_records', 'prescriptions');
    await dropIfExists('medical_records', 'lab_results');
    await dropIfExists('medical_records', 'attachments');
    await dropIfExists('appointments', 'prescriptions');
  },

  async down(queryInterface, Sequelize) {
    // Restores the structural shape of the old schema.
    // Child table data is NOT migrated back — this is a structural rollback only.

    const columnExists = async (table, column) => {
      const cols = await queryInterface.describeTable(table);
      return Object.prototype.hasOwnProperty.call(cols, column);
    };

    const addJsonIfMissing = async (table, column) => {
      if (!(await columnExists(table, column))) {
        await queryInterface.addColumn(table, column, {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: [],
        });
      }
    };

    // Restore dropped columns in reverse order
    await addJsonIfMissing('appointments', 'prescriptions');
    await addJsonIfMissing('medical_records', 'attachments');
    await addJsonIfMissing('medical_records', 'lab_results');
    await addJsonIfMissing('medical_records', 'prescriptions');
    await addJsonIfMissing('medical_records', 'symptoms');
    await addJsonIfMissing('doctors', 'languages');
    await addJsonIfMissing('doctors', 'qualifications');
    await addJsonIfMissing('patients', 'allergies');
    await addJsonIfMissing('patients', 'insurance_info');

    // Revert address TEXT → JSON (content is lost; existing encrypted text is discarded)
    if (await columnExists('patients', 'address')) {
      await queryInterface.sequelize.query(
        `ALTER TABLE patients MODIFY COLUMN address JSON NULL`
      );
    }

    // Drop child tables in reverse FK dependency order
    const childTables = [
      'medical_attachments',
      'lab_results',
      'prescriptions',
      'symptoms',
      'doctor_languages',
      'doctor_qualifications',
      'patient_allergies',
    ];
    for (const table of childTables) {
      await queryInterface.dropTable(table, { cascade: true });
    }
  },
};
