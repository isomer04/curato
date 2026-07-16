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
import {
  UserRole,
  Gender,
  AppointmentStatus,
  MedicalRecordType,
  DayOfWeek,
  InsuranceStatus,
} from '../src/types/constants';

// All demo accounts share this password. Hashed by the User model's beforeCreate hook.
const DEMO_PASSWORD = 'Demo1234!';

// Sentinel email used to detect whether demo data already exists.
const DEMO_ADMIN_EMAIL = 'demo.admin@infinitesevens.com';

export const runDemoSeed = async (): Promise<void> => {
  // --- Idempotency gate ---
  const existing = await User.findOne({ where: { email: DEMO_ADMIN_EMAIL } });
  if (existing) {
    console.log('[demo-seed] Demo data already present — skipping.');
    return;
  }

  console.log('[demo-seed] Seeding demo data...');

  // ------------------------------------------------------------------ Users
  const adminUser = await User.create({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_PASSWORD,
    role: UserRole.ADMIN,
    firstName: 'Demo',
    lastName: 'Admin',
    isEmailVerified: true,
    isActive: true,
  });

  const drSarahUser = await User.create({
    email: 'demo.dr.sarah@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.DOCTOR,
    firstName: 'Sarah',
    lastName: 'Mitchell',
    phoneNumber: '555-0201',
    isEmailVerified: true,
    isActive: true,
  });

  const drMichaelUser = await User.create({
    email: 'demo.dr.michael@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.DOCTOR,
    firstName: 'Michael',
    lastName: 'Chen',
    phoneNumber: '555-0202',
    isEmailVerified: true,
    isActive: true,
  });

  const drPriyaUser = await User.create({
    email: 'demo.dr.priya@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.DOCTOR,
    firstName: 'Priya',
    lastName: 'Patel',
    phoneNumber: '555-0203',
    isEmailVerified: true,
    isActive: true,
  });

  const drRobertUser = await User.create({
    email: 'demo.dr.robert@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.DOCTOR,
    firstName: 'Robert',
    lastName: 'Johnson',
    phoneNumber: '555-0204',
    isEmailVerified: true,
    isActive: true,
  });

  const aliceUser = await User.create({
    email: 'demo.patient.alice@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.PATIENT,
    firstName: 'Alice',
    lastName: 'Johnson',
    phoneNumber: '555-0301',
    isEmailVerified: true,
    isActive: true,
  });

  const bobUser = await User.create({
    email: 'demo.patient.bob@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.PATIENT,
    firstName: 'Bob',
    lastName: 'Martinez',
    phoneNumber: '555-0302',
    isEmailVerified: true,
    isActive: true,
  });

  const carolUser = await User.create({
    email: 'demo.patient.carol@infinitesevens.com',
    password: DEMO_PASSWORD,
    role: UserRole.PATIENT,
    firstName: 'Carol',
    lastName: 'Williams',
    phoneNumber: '555-0303',
    isEmailVerified: true,
    isActive: true,
  });

  // Suppress unused variable warning for adminUser — it is intentionally created
  // so the admin account exists in the database but has no sub-profile row.
  void adminUser;

  // --------------------------------------------------------------- Doctors
  const drSarah = await Doctor.create({
    userId: drSarahUser.id,
    specialization: 'Cardiology',
    licenseNumber: 'MD-SARAH-001',
    yearsOfExperience: 15,
    consultationFee: 200,
    bio: 'Board-certified cardiologist with 15 years of experience in preventive and interventional cardiology.',
    qualifications: [
      { degree: 'MD', institution: 'Johns Hopkins University', year: 2008 },
      { degree: 'Fellowship in Cardiology', institution: 'Mayo Clinic', year: 2011 },
    ],
    languages: ['English', 'Spanish'],
    rating: 4.8,
    totalPatients: 340,
    isApproved: true,
  });

  const drMichael = await Doctor.create({
    userId: drMichaelUser.id,
    specialization: 'General Practice',
    licenseNumber: 'MD-MICHAEL-002',
    yearsOfExperience: 8,
    consultationFee: 120,
    bio: 'General practitioner focused on family medicine and preventive care.',
    qualifications: [{ degree: 'MD', institution: 'Stanford University', year: 2015 }],
    languages: ['English', 'Mandarin'],
    rating: 4.6,
    totalPatients: 210,
    isApproved: true,
  });

  const drPriya = await Doctor.create({
    userId: drPriyaUser.id,
    specialization: 'Dermatology',
    licenseNumber: 'MD-PRIYA-003',
    yearsOfExperience: 12,
    consultationFee: 175,
    bio: 'Dermatologist specialising in medical and cosmetic dermatology, including acne, eczema, and skin cancer screening.',
    qualifications: [
      { degree: 'MD', institution: 'Harvard Medical School', year: 2011 },
      { degree: 'Residency in Dermatology', institution: 'UCSF', year: 2014 },
    ],
    languages: ['English', 'Hindi', 'Gujarati'],
    rating: 4.9,
    totalPatients: 290,
    isApproved: true,
  });

  const drRobert = await Doctor.create({
    userId: drRobertUser.id,
    specialization: 'Pediatrics',
    licenseNumber: 'MD-ROBERT-004',
    yearsOfExperience: 20,
    consultationFee: 150,
    bio: 'Experienced pediatrician providing comprehensive care for newborns through adolescents.',
    qualifications: [
      { degree: 'MD', institution: 'Columbia University', year: 2003 },
      { degree: 'Pediatric Residency', institution: "Children's Hospital of Philadelphia", year: 2006 },
    ],
    languages: ['English'],
    rating: 4.7,
    totalPatients: 520,
    isApproved: true,
  });

  // --------------------------------------------------------------- Patients
  const alice = await Patient.create({
    userId: aliceUser.id,
    dateOfBirth: new Date('1985-03-15'),
    gender: Gender.FEMALE,
    bloodGroup: 'A+',
    allergies: ['Penicillin'],
    emergencyContactName: 'Mark Johnson',
    emergencyContactPhone: '555-0401',
    address: {
      street: '123 Maple Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'USA',
    },
  });

  const bob = await Patient.create({
    userId: bobUser.id,
    dateOfBirth: new Date('1978-07-22'),
    gender: Gender.MALE,
    bloodGroup: 'O+',
    allergies: [],
    emergencyContactName: 'Maria Martinez',
    emergencyContactPhone: '555-0402',
    address: {
      street: '456 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
    },
  });

  const carol = await Patient.create({
    userId: carolUser.id,
    dateOfBirth: new Date('1992-11-08'),
    gender: Gender.FEMALE,
    bloodGroup: 'B+',
    allergies: ['Sulfa drugs'],
    emergencyContactName: 'James Williams',
    emergencyContactPhone: '555-0403',
    address: {
      street: '789 Pine Road',
      city: 'Evanston',
      state: 'IL',
      zipCode: '60201',
      country: 'USA',
    },
  });

  // ------------------------------------------------------- Doctor Availability
  const allDoctors = [drSarah, drMichael, drPriya, drRobert];
  const days = Object.values(DayOfWeek);
  const effectiveFrom = new Date();
  const effectiveTo = new Date();
  effectiveTo.setFullYear(effectiveTo.getFullYear() + 1);
  const weekendDays: DayOfWeek[] = [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY];

  for (const doc of allDoctors) {
    for (const day of days) {
      await DoctorAvailability.create({
        doctorId: doc.id,
        dayOfWeek: day,
        startTime: '09:00:00',
        endTime: '17:00:00',
        slotDuration: 30,
        isActive: !weekendDays.includes(day),
        effectiveFrom,
        effectiveTo,
      });
    }
  }

  // --------------------------------------------------------------- Insurance
  const today = new Date();

  await Insurance.create({
    patientId: alice.id,
    providerName: 'Blue Cross Blue Shield',
    policyNumber: 'BCBS-2026-ALICE',
    groupNumber: 'GRP-8847',
    subscriberName: 'Alice Johnson',
    subscriberRelation: 'self',
    planType: 'PPO',
    coverageStartDate: '2026-01-01',
    coverageEndDate: '2026-12-31',
    copayAmount: 25.0,
    deductibleAmount: 1500.0,
    deductibleMet: 450.0,
    verificationStatus: InsuranceStatus.VERIFIED,
    verificationDate: new Date('2026-01-10'),
    verificationNotes: 'Verified via provider portal. All fields confirmed.',
    isActive: true,
  });

  await Insurance.create({
    patientId: bob.id,
    providerName: 'Aetna Health',
    policyNumber: 'AET-2026-BOB',
    groupNumber: 'GRP-5531',
    subscriberName: 'Bob Martinez',
    subscriberRelation: 'self',
    planType: 'HMO',
    coverageStartDate: '2026-01-01',
    coverageEndDate: '2026-12-31',
    copayAmount: 20.0,
    deductibleAmount: 1000.0,
    deductibleMet: 1000.0,
    verificationStatus: InsuranceStatus.VERIFIED,
    verificationDate: new Date('2026-01-15'),
    verificationNotes: 'Deductible fully met as of March 2026.',
    isActive: true,
  });

  // ----------------------------------------------------------- Appointments
  const offset = (days_: number): Date => {
    const d = new Date(today);
    d.setDate(d.getDate() + days_);
    return d;
  };

  // Alice + Dr. Chen — tomorrow — scheduled
  const apptAliceMichael = await Appointment.create({
    patientId: alice.id,
    doctorId: drMichael.id,
    appointmentDate: offset(1),
    startTime: '10:00:00',
    endTime: '10:30:00',
    status: AppointmentStatus.SCHEDULED,
    reasonForVisit: 'Annual checkup and blood pressure review',
  });

  // Alice + Dr. Mitchell — +3 days — confirmed
  const apptAliceSarah = await Appointment.create({
    patientId: alice.id,
    doctorId: drSarah.id,
    appointmentDate: offset(3),
    startTime: '11:00:00',
    endTime: '11:30:00',
    status: AppointmentStatus.CONFIRMED,
    reasonForVisit: 'Cardiac follow-up — routine ECG',
  });

  // Alice + Dr. Patel — −5 days — completed
  const apptAlicePriya = await Appointment.create({
    patientId: alice.id,
    doctorId: drPriya.id,
    appointmentDate: offset(-5),
    startTime: '14:00:00',
    endTime: '14:30:00',
    status: AppointmentStatus.COMPLETED,
    reasonForVisit: 'Eczema flare-up on forearms',
  });

  // Bob + Dr. Johnson — −10 days — completed
  const apptBobRobert = await Appointment.create({
    patientId: bob.id,
    doctorId: drRobert.id,
    appointmentDate: offset(-10),
    startTime: '09:30:00',
    endTime: '10:00:00',
    status: AppointmentStatus.COMPLETED,
    reasonForVisit: 'Annual physical for mid-forties health screening',
  });

  // Carol + Dr. Chen — +7 days — scheduled
  await Appointment.create({
    patientId: carol.id,
    doctorId: drMichael.id,
    appointmentDate: offset(7),
    startTime: '13:00:00',
    endTime: '13:30:00',
    status: AppointmentStatus.SCHEDULED,
    reasonForVisit: 'Persistent cough for two weeks',
  });

  // Bob + Dr. Mitchell — −2 days — cancelled
  await Appointment.create({
    patientId: bob.id,
    doctorId: drSarah.id,
    appointmentDate: offset(-2),
    startTime: '15:00:00',
    endTime: '15:30:00',
    status: AppointmentStatus.CANCELLED,
    reasonForVisit: 'Chest pain evaluation',
    cancellationReason: 'Patient rescheduled due to work conflict.',
    cancelledBy: bobUser.id,
  });

  // Carol + Dr. Patel — +14 days — confirmed
  await Appointment.create({
    patientId: carol.id,
    doctorId: drPriya.id,
    appointmentDate: offset(14),
    startTime: '10:30:00',
    endTime: '11:00:00',
    status: AppointmentStatus.CONFIRMED,
    reasonForVisit: 'Mole assessment and full skin check',
  });

  // --------------------------------------------------------- Medical Records
  // Alice — completed dermatology appointment
  await MedicalRecord.create({
    patientId: alice.id,
    doctorId: drPriya.id,
    appointmentId: apptAlicePriya.id,
    recordType: MedicalRecordType.CONSULTATION,
    diagnosis: 'Atopic Dermatitis (Eczema)',
    notes:
      'Patient presented with inflamed, itchy patches on both forearms. Consistent with atopic dermatitis triggered by new laundry detergent. Advised to switch to hypoallergenic products and avoid scratching.',
    prescriptions: [
      {
        medication: 'Hydrocortisone cream 1%',
        dosage: 'Apply thin layer',
        frequency: 'Twice daily',
        duration: '2 weeks',
        startDate: offset(-5).toISOString().split('T')[0],
      },
      {
        medication: 'Cetirizine',
        dosage: '10mg',
        frequency: 'Once daily at bedtime',
        duration: '2 weeks',
        startDate: offset(-5).toISOString().split('T')[0],
      },
    ],
    isConfidential: false,
  });

  // Bob — completed pediatrics appointment (annual physical)
  await MedicalRecord.create({
    patientId: bob.id,
    doctorId: drRobert.id,
    appointmentId: apptBobRobert.id,
    recordType: MedicalRecordType.CONSULTATION,
    diagnosis: 'Healthy Adult — Routine Physical',
    notes:
      'No acute complaints. Blood pressure 122/78 mmHg, heart rate 72 bpm, BMI 24.8. Recommended continued moderate exercise and a low-sodium diet. Referred for lipid panel lab work.',
    prescriptions: [],
    isConfidential: false,
  });

  // Suppress unused variable for confirmed/scheduled appointments — they exist in DB
  void apptAliceMichael;
  void apptAliceSarah;

  // --------------------------------------------------------------- Messages
  // Conversation 1 — Alice ↔ Dr. Chen
  await Message.create({
    senderId: aliceUser.id,
    receiverId: drMichaelUser.id,
    content:
      'Hi Dr. Chen, just confirming my appointment tomorrow at 10:00 AM. Should I bring any previous lab results?',
    isRead: true,
    readAt: new Date(today.getTime() - 3600_000),
  });

  await Message.create({
    senderId: drMichaelUser.id,
    receiverId: aliceUser.id,
    content:
      "Hi Alice! Yes, please bring any lab results from the past 12 months if you have them. See you tomorrow at 10 AM.",
    isRead: true,
    readAt: new Date(today.getTime() - 1800_000),
  });

  // Conversation 2 — Bob ↔ Dr. Johnson
  await Message.create({
    senderId: bobUser.id,
    receiverId: drRobertUser.id,
    content: 'Dr. Johnson, thank you for the thorough checkup last week. The lipid panel came back normal!',
    isRead: true,
    readAt: new Date(today.getTime() - 86400_000),
  });

  await Message.create({
    senderId: drRobertUser.id,
    receiverId: bobUser.id,
    content:
      'That is great news, Bob! Keep up the healthy lifestyle. We will do a follow-up again in 12 months.',
    isRead: false,
  });

  console.log('[demo-seed] Done. Demo data seeded successfully.');
  console.log('[demo-seed] Demo password for all accounts: Demo1234!');
};

// Main runner — invoked directly via `npm run demo-seed`
const main = async (): Promise<void> => {
  try {
    initializeAssociations();
    await sequelize.authenticate();
    await runDemoSeed();
    process.exit(0);
  } catch (error) {
    console.error('[demo-seed] Fatal error:', error);
    process.exit(1);
  }
};

main();
