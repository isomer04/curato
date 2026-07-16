import { User, Doctor, DoctorAvailability, initializeAssociations } from '../src/models';
import { UserRole, DayOfWeek } from '../src/types/constants';

const addDoctors = async () => {
  try {
    initializeAssociations();

    const doctorsData = [
      {
        email: 'dermatologist@test.com',
        firstName: 'Emily',
        lastName: 'Skin',
        specialization: 'Dermatology',
        licenseNumber: 'DERM001',
        bio: 'Specialist in skin conditions.',
      },
      {
        email: 'orthopedics@test.com',
        firstName: 'James',
        lastName: 'Bone',
        specialization: 'Orthopedics',
        licenseNumber: 'ORTHO001',
        bio: 'Bone and joint specialist.',
      },
      {
        email: 'pediatrician@test.com',
        firstName: 'Alice',
        lastName: 'Child',
        specialization: 'Pediatrics',
        licenseNumber: 'PEDIA001',
        bio: 'Dedicated pediatrician.',
      },
      {
        email: 'psychiatrist@test.com',
        firstName: 'Brain',
        lastName: 'Mind',
        specialization: 'Psychiatry',
        licenseNumber: 'PSYCH001',
        bio: 'Mental health professional.',
      },
    ];

    const createdDoctors = [];

    for (const dr of doctorsData) {
      const user = await User.create({
        email: dr.email,
        password: 'Password123!',
        role: UserRole.DOCTOR,
        firstName: dr.firstName,
        lastName: dr.lastName,
      });

      const doctor = await Doctor.create({
        userId: user.id,
        specialization: dr.specialization,
        licenseNumber: dr.licenseNumber,
        yearsOfExperience: 10,
        consultationFee: 200,
        bio: dr.bio,
      });

      createdDoctors.push(doctor);
    }

    const days = Object.values(DayOfWeek);
    const effectiveFrom = new Date();
    const effectiveTo = new Date();
    effectiveTo.setFullYear(effectiveTo.getFullYear() + 1);

    for (const doc of createdDoctors) {
      for (const day of days) {
        await DoctorAvailability.create({
          doctorId: doc.id,
          dayOfWeek: day,
          startTime: '09:00:00',
          endTime: '17:00:00',
          slotDuration: 30,
          isActive: !([DayOfWeek.SATURDAY, DayOfWeek.SUNDAY] as DayOfWeek[]).includes(day),
          effectiveFrom,
          effectiveTo,
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error adding doctors:', error);
    process.exit(1);
  }
};

addDoctors();
