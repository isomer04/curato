jest.mock('../../repositories/user.repository', () => ({
  userRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../repositories/patient.repository', () => ({
  patientRepository: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { userService, SafeUserUpdateData, type SafePatientUpdateData } from '../../services/user.service';
import { userRepository } from '../../repositories/user.repository';
import { patientRepository } from '../../repositories/patient.repository';
import { NotFoundError } from '../../shared/errors';
import { UserRole } from '../../types/constants';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'user@test.com',
  role: UserRole.PATIENT,
  isActive: true,
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makePatient = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  userId: 'u1',
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('UserService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('getUsers', () => {
    it('returns paginated users list', async () => {
      (userRepository.findAll as jest.Mock).mockResolvedValue({ users: [makeUser()], total: 1 });
      const result = await userService.getUsers({ page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(userRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('passes filters to repository', async () => {
      (userRepository.findAll as jest.Mock).mockResolvedValue({ users: [], total: 0 });
      await userService.getUsers({ role: UserRole.DOCTOR, isActive: true, search: 'john' });
      expect(userRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.DOCTOR, isActive: true, search: 'john' })
      );
    });
  });


  describe('getUserById', () => {
    it('returns user when found', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      const result = await userService.getUserById('u1');
      expect(result).toBe(mockUser);
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(userService.getUserById('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('updateUser', () => {
    it('happy path — updates user and returns refreshed record', async () => {
      const mockUser = makeUser();
      const updatedUser = makeUser({ firstName: 'Updated' });
      (userRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser) // first call for finding the user to update
        .mockResolvedValueOnce(updatedUser); // second call for returning fresh record

      const result = await userService.updateUser('u1', { firstName: 'Updated' });

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.not.objectContaining({ password: expect.anything() })
      );
      expect(result).toBe(updatedUser);
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(userService.updateUser('ghost', {})).rejects.toThrow(NotFoundError);
    });

    it('strips password from update payload', async () => {
      const mockUser = makeUser();
      const updatedUser = makeUser();
      (userRepository.findById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser);

      await userService.updateUser('u1', { password: 'hacked' } as unknown as SafeUserUpdateData);

      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser,
        expect.not.objectContaining({ password: 'hacked' })
      );
    });
  });


  describe('deactivateUser', () => {
    it('sets isActive=false and clears refreshToken', async () => {
      const mockUser = makeUser();
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await userService.deactivateUser('u1');

      expect(userRepository.update).toHaveBeenCalledWith(mockUser, {
        isActive: false,
        refreshToken: null,
      });
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(userService.deactivateUser('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('activateUser', () => {
    it('sets isActive=true', async () => {
      const mockUser = makeUser({ isActive: false });
      (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      await userService.activateUser('u1');

      expect(userRepository.update).toHaveBeenCalledWith(mockUser, { isActive: true });
    });

    it('throws NotFoundError when user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(userService.activateUser('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('getPatientById', () => {
    it('returns patient when found', async () => {
      const mockPatient = makePatient();
      (patientRepository.findById as jest.Mock).mockResolvedValue(mockPatient);
      const result = await userService.getPatientById('p1');
      expect(result).toBe(mockPatient);
    });

    it('throws NotFoundError when patient not found', async () => {
      (patientRepository.findById as jest.Mock).mockResolvedValue(null);
      await expect(userService.getPatientById('ghost')).rejects.toThrow(NotFoundError);
    });
  });


  describe('updatePatientProfile', () => {
    it('happy path — updates and returns refreshed patient', async () => {
      const mockPatient = makePatient();
      const updatedPatient = makePatient({ bloodGroup: 'A+' });
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(mockPatient);
      (patientRepository.findById as jest.Mock).mockResolvedValue(updatedPatient);

      const payload: SafePatientUpdateData = { bloodGroup: 'A+' };
      const result = await userService.updatePatientProfile('u1', payload);

      expect(patientRepository.update).toHaveBeenCalledWith(
        mockPatient,
        expect.objectContaining({ bloodGroup: 'A+' })
      );
      expect(result).toBe(updatedPatient);
    });

    it('throws NotFoundError when patient profile not found', async () => {
      (patientRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      await expect(userService.updatePatientProfile('ghost', {})).rejects.toThrow(NotFoundError);
    });
  });
});
