import { sequelize } from '../src/config/database';
import { initializeAssociations, User, Doctor, Patient } from '../src/models';
import { UserRole, Gender } from '../src/types/constants';

/**
 * Safe, idempotent seed that creates the three demo accounts used by the
 * frontend "Try demo accounts" buttons:
 *
 *   patient@test.com  / Password123!
 *   doctor@test.com   / Password123!
 *   admin@test.com    / Password123!
 *
 * Safe to run multiple times — uses findOrCreate so it never overwrites
 * existing data and never calls sequelize.sync().
 */
const DEMO_PASSWORD = 'Password123!';

const seedDemoAccounts = async (): Promise<void> => {
  initializeAssociations();

  // ----------------------------------------------------------------------- Admin
  const [adminUser, adminCreated] = await User.findOrCreate({
    where: { email: 'admin@test.com' },
    defaults: {
      email: 'admin@test.com',
      password: DEMO_PASSWORD,
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`[seed-demo-accounts] admin@test.com — ${adminCreated ? 'created' : 'already exists'} (id: ${adminUser.id})`);

  // ----------------------------------------------------------------------- Doctor user
  const [doctorUser, doctorUserCreated] = await User.findOrCreate({
    where: { email: 'doctor@test.com' },
    defaults: {
      email: 'doctor@test.com',
      password: DEMO_PASSWORD,
      role: UserRole.DOCTOR,
      firstName: 'John',
      lastName: 'Doe',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`[seed-demo-accounts] doctor@test.com — ${doctorUserCreated ? 'created' : 'already exists'} (id: ${doctorUser.id})`);

  // Doctor profile — isApproved must be true or login is rejected
  const [, doctorProfileCreated] = await Doctor.findOrCreate({
    where: { userId: doctorUser.id },
    defaults: {
      userId: doctorUser.id,
      specialization: 'General Practice',
      licenseNumber: 'MD-DEMO-001',
      yearsOfExperience: 10,
      consultationFee: 150,
      bio: 'Demo doctor account for testing.',
      isApproved: true,
    },
  });
  console.log(`[seed-demo-accounts] Doctor profile — ${doctorProfileCreated ? 'created' : 'already exists'}`);

  // ----------------------------------------------------------------------- Patient user
  const [patientUser, patientUserCreated] = await User.findOrCreate({
    where: { email: 'patient@test.com' },
    defaults: {
      email: 'patient@test.com',
      password: DEMO_PASSWORD,
      role: UserRole.PATIENT,
      firstName: 'Jane',
      lastName: 'Smith',
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`[seed-demo-accounts] patient@test.com — ${patientUserCreated ? 'created' : 'already exists'} (id: ${patientUser.id})`);

  // Patient profile
  const [, patientProfileCreated] = await Patient.findOrCreate({
    where: { userId: patientUser.id },
    defaults: {
      userId: patientUser.id,
      dateOfBirth: new Date('1990-01-01'),
      gender: Gender.FEMALE,
      bloodGroup: 'A+',
      emergencyContactName: 'John Smith',
      emergencyContactPhone: '555-0100',
    },
  });
  console.log(`[seed-demo-accounts] Patient profile — ${patientProfileCreated ? 'created' : 'already exists'}`);
};

(async () => {
  try {
    await sequelize.authenticate();
    console.log('[seed-demo-accounts] DB connection established.');
    await seedDemoAccounts();
    console.log('[seed-demo-accounts] Done.');
  } catch (err) {
    console.error('[seed-demo-accounts] Error:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
