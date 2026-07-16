/**
 * Migration: add appointment PHI actions to the phi_audit_logs.action enum column.
 * Safe to re-run — MODIFY COLUMN is idempotent if values already exist.
 *
 * Usage: npx ts-node scripts/migrate-phi-audit-actions.ts
 */
import { sequelize } from '../src/config/database';

const ALL_ACTIONS = [
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
];

const run = async (): Promise<void> => {
  await sequelize.authenticate();
  console.log('✅ Connected.');

  const enumLiteral = ALL_ACTIONS.map(v => `'${v}'`).join(',');
  await sequelize.query(
    `ALTER TABLE phi_audit_logs MODIFY COLUMN action ENUM(${enumLiteral}) NOT NULL`
  );

  console.log('✅ action enum updated with all appointment PHI actions.');
  await sequelize.close();
};

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
