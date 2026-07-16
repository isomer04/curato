import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { UserRole } from '../models';
import { User } from '../models/user.model';

describe('StorageService', () => {
  let service: StorageService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    role: UserRole.PATIENT,
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isEmailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [StorageService] });
    service = TestBed.inject(StorageService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('access token (in-memory)', () => {
    it('StorageService — getAccessToken — no token set — returns null', () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it('StorageService — setTokens then getAccessToken — returns stored token', () => {
      service.setTokens('my-token');
      expect(service.getAccessToken()).toBe('my-token');
    });

    it('StorageService — clearAuth — clears access token', () => {
      service.setTokens('my-token');
      service.clearAuth();
      expect(service.getAccessToken()).toBeNull();
    });
  });

  describe('user persistence (sessionStorage)', () => {
    it('StorageService — getUser — no user stored — returns null', () => {
      expect(service.getUser()).toBeNull();
    });

    it('StorageService — setUser then getUser — returns stored user', () => {
      service.setUser(mockUser);
      expect(service.getUser()).toEqual(mockUser);
    });

    it('StorageService — clearAuth — removes user from sessionStorage', () => {
      service.setUser(mockUser);
      service.clearAuth();
      expect(service.getUser()).toBeNull();
    });

    it('StorageService — getUser — malformed JSON — returns null', () => {
      sessionStorage.setItem('user', '{invalid json}');
      expect(service.getUser()).toBeNull();
    });
  });

  describe('generic item storage', () => {
    it('StorageService — setItem then getItem — returns stored string', () => {
      service.setItem('myKey', 'myValue');
      expect(service.getItem('myKey')).toBe('myValue');
    });

    it('StorageService — getItem — missing key — returns null', () => {
      expect(service.getItem('missing')).toBeNull();
    });

    it('StorageService — removeItem — removes the stored item', () => {
      service.setItem('myKey', 'myValue');
      service.removeItem('myKey');
      expect(service.getItem('myKey')).toBeNull();
    });

    it('StorageService — clearAll — clears all sessionStorage entries', () => {
      service.setItem('a', '1');
      service.setItem('b', '2');
      service.clearAll();
      expect(service.getItem('a')).toBeNull();
      expect(service.getItem('b')).toBeNull();
      expect(service.getAccessToken()).toBeNull();
    });
  });
});
