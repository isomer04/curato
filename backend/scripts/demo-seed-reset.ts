import { Op } from 'sequelize';
import { sequelize } from '../src/config/database';
import {
  initializeAssociations,
  User,
  Doctor,
  Patient,
  Appointment,
  MedicalRecord,
  DoctorAvailability,
  Insurance,
  Message,
} from '../src/models';
import { runDemoSeed } from './demo-seed';

const DEMO_EMAIL_PATTERN = 'demo.%@infinitesevens.com';

const resetDemoData = async (): Promise<void> => {
  console.log('[demo-seed-reset] Locating existing demo users...');

  const demoUsers = await User.findAll({
    where: { email: { [Op.like]: DEMO_EMAIL_PATTERN } },
    attributes: ['id', 'email'],
  });

  if (demoUsers.length === 0) {
    console.log('[demo-seed-reset] No existing demo data found — proceeding straight to seed.');
  } else {
    const demoUserIds = demoUsers.map((u) => u.id);
    console.log(`[demo-seed-reset] Found ${demoUsers.length} demo user(s). Deleting dependent data...`);

    // Resolve demo patient and doctor profile IDs
    const demoPatients = await Patient.findAll({
      where: { userId: { [Op.in]: demoUserIds } },
      attributes: ['id'],
      paranoid: false,
    });
    const demoPatientIds = demoPatients.map((p) => p.id);

    const demoDoctors = await Doctor.findAll({
      where: { userId: { [Op.in]: demoUserIds } },
      attributes: ['id'],
      paranoid: false,
    });
    const demoDoctorIds = demoDoctors.map((d) => d.id);

    // Resolve demo appointment IDs for medical record cleanup
    const demoAppointments = await Appointment.findAll({
      where: {
        [Op.or]: [
          { patientId: { [Op.in]: demoPatientIds } },
          { doctorId: { [Op.in]: demoDoctorIds } },
        ],
      },
      attributes: ['id'],
      paranoid: false,
    });
    const demoAppointmentIds = demoAppointments.map((a) => a.id);

    // Delete in dependency order (children before parents)

    // 1. Messages sent or received by demo users
    await Message.destroy({
      where: {
        [Op.or]: [
          { senderId: { [Op.in]: demoUserIds } },
          { receiverId: { [Op.in]: demoUserIds } },
        ],
      },
      force: true, // hard-delete: paranoid model
    });
    console.log('[demo-seed-reset] Messages deleted.');

    // 2. Medical records linked to demo appointments
    if (demoAppointmentIds.length > 0) {
      await MedicalRecord.destroy({
        where: { appointmentId: { [Op.in]: demoAppointmentIds } },
        force: true,
      });
      console.log('[demo-seed-reset] Medical records deleted.');
    }

    // 3. Appointments for demo patients or doctors
    if (demoPatientIds.length > 0 || demoDoctorIds.length > 0) {
      await Appointment.destroy({
        where: {
          [Op.or]: [
            ...(demoPatientIds.length > 0 ? [{ patientId: { [Op.in]: demoPatientIds } }] : []),
            ...(demoDoctorIds.length > 0 ? [{ doctorId: { [Op.in]: demoDoctorIds } }] : []),
          ],
        },
        force: true,
      });
      console.log('[demo-seed-reset] Appointments deleted.');
    }

    // 4. Insurance records for demo patients
    if (demoPatientIds.length > 0) {
      await Insurance.destroy({
        where: { patientId: { [Op.in]: demoPatientIds } },
        force: true,
      });
      console.log('[demo-seed-reset] Insurance records deleted.');
    }

    // 5. Doctor availability for demo doctors
    if (demoDoctorIds.length > 0) {
      await DoctorAvailability.destroy({
        where: { doctorId: { [Op.in]: demoDoctorIds } },
        force: false, // non-paranoid model
      });
      console.log('[demo-seed-reset] Doctor availability deleted.');
    }

    // 6. Doctor profiles
    if (demoDoctorIds.length > 0) {
      await Doctor.destroy({
        where: { id: { [Op.in]: demoDoctorIds } },
        force: true,
      });
      console.log('[demo-seed-reset] Doctor profiles deleted.');
    }

    // 7. Patient profiles
    if (demoPatientIds.length > 0) {
      await Patient.destroy({
        where: { id: { [Op.in]: demoPatientIds } },
        force: true,
      });
      console.log('[demo-seed-reset] Patient profiles deleted.');
    }

    // 8. Demo user accounts
    await User.destroy({
      where: { email: { [Op.like]: DEMO_EMAIL_PATTERN } },
      force: false, // User model is not paranoid
    });
    console.log('[demo-seed-reset] Demo user accounts deleted.');
  }

  // Re-seed fresh demo data
  await runDemoSeed();
};

const main = async (): Promise<void> => {
  try {
    initializeAssociations();
    await sequelize.authenticate();
    await resetDemoData();
    process.exit(0);
  } catch (error) {
    console.error('[demo-seed-reset] Fatal error:', error);
    process.exit(1);
  }
};

main();
