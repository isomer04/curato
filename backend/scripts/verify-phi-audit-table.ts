import { sequelize } from '../src/config/database';

(async () => {
  await sequelize.authenticate();
  const [rows] = await sequelize.query('SHOW COLUMNS FROM phi_audit_logs') as [Record<string, string>[], unknown];
  console.log('\nphi_audit_logs columns:');
  rows.forEach(r => console.log(' ', r['Field'], '-', r['Type']));
  await sequelize.close();
})().catch(console.error);
