/**
 * One-time migration script: create the phi_audit_logs table.
 *
 * This script exists because the project's global sequelize.sync({ alter })
 * hits MySQL's 64-key-per-table limit on existing tables, aborting the full
 * sync before it can create new tables. Running sync() on just PhiAuditLog
 * bypasses that constraint entirely.
 *
 * Usage (from the backend/ directory):
 *   npx ts-node scripts/create-phi-audit-table.ts
 */
import { sequelize } from '../src/config/database';
// Importing the model registers it with the shared Sequelize instance.
import { PhiAuditLog } from '../src/models/PhiAuditLog.model';

const run = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // sync({ force: false }) = CREATE TABLE IF NOT EXISTS.
    // Use force: true only if you need to rebuild from scratch (drops existing data).
    await PhiAuditLog.sync({ force: false });
    console.log('✅ phi_audit_logs table created (or already existed).');
  } catch (error) {
    console.error('❌ Failed to create phi_audit_logs table:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
