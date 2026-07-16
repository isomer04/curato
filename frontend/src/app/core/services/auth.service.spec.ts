import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { UserRole, User } from '../models';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let storageServiceSpy: jasmine.SpyObj<StorageService>;

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

  const mockTokens = {
    accessToken: 'fake-access-token',
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    storageServiceSpy = jasmine.createSpyObj('StorageService', [
      'getAccessToken',
      'getUser',
      'setTokens',
      'setUser',
      'clearAuth',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: StorageService, useValue: storageServiceSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Login', () => {
    it('should authenticate user and store tokens on success', () => {
      const credentials = { email: 'test@example.com', password: 'password' };

      service.login(credentials).subscribe((response) => {
        expect(response.success).toBeTrue();
        if (!response.data.mfaRequired) {
          expect(response.data.user).toEqual(mockUser);
        }
        expect(service.isAuthenticated()).toBeTrue();
        expect(service.currentUser()).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({
        success: true,
        data: { user: mockUser, accessToken: mockTokens.accessToken },
      });

      expect(storageServiceSpy.setTokens).toHaveBeenCalledWith(mockTokens.accessToken);
      expect(storageServiceSpy.setUser).toHaveBeenCalledWith(mockUser);
    });

    it('should handle login error correctly', () => {
      const credentials = { email: 'test@example.com', password: 'wrong-password' };

      service.login(credentials).subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
          expect(service.isAuthenticated()).toBeFalse();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(storageServiceSpy.setTokens).not.toHaveBeenCalled();
    });
  });

  describe('Role Checking', () => {
    it('should return true if user has the role', () => {
      // Manually set signal for testing (since it's private/protected setters usually, but we can simulate state via init or mock)
      // Since we can't easily write to signals from outside without a visible setter/method, we'll simulate a login flow first or use reflection if needed.
      // Better: Validate logic by simulating login first.

      // Simulate logged in state
      (
        service as unknown as { currentUserSignal: { set: (v: User | null) => void } }
      ).currentUserSignal.set(mockUser); // Accessing private signal for test setup

      expect(service.hasRole(UserRole.PATIENT)).toBeTrue();
      expect(service.hasRole(UserRole.DOCTOR)).toBeFalse();
    });

    it('should return false if no user is logged in', () => {
      (
        service as unknown as { currentUserSignal: { set: (v: User | null) => void } }
      ).currentUserSignal.set(null);
      expect(service.hasRole(UserRole.PATIENT)).toBeFalse();
    });
  });

  describe('Logout', () => {
    it('should clear auth and navigate to login', () => {
      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      expect(storageServiceSpy.clearAuth).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
      expect(service.currentUser()).toBeNull();
    });
  });
  describe('Profile Management', () => {
    it('should update profile and update local user signal', () => {
      const updateData = { firstName: 'Updated', lastName: 'Name', phoneNumber: '9998887777' };
      const updatedUser = { ...mockUser, ...updateData };

      service.updateProfile(updateData).subscribe((res) => {
        expect(res.data).toEqual(updatedUser);
        expect(service.currentUser()).toEqual(updatedUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/profile`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ data: updatedUser });

      expect(storageServiceSpy.setUser).toHaveBeenCalledWith(updatedUser);
    });

    it('should request email change', () => {
      const newEmail = 'new@test.com';

      service.requestEmailChange(newEmail).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/request-email-change`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ newEmail });
      req.flush({ success: true });
    });

    it('should confirm email change', () => {
      const token = '12345';

      service.confirmEmailChange(token).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/confirm-email-change`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token });
      req.flush({ success: true });
    });

    it('should fetch and store profile', () => {
      service.getProfile().subscribe((res) => {
        expect(res.data).toEqual(mockUser);
        expect(service.currentUser()).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/profile`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockUser });

      expect(storageServiceSpy.setUser).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Registration', () => {
    it('AuthService — register — success without MFA — stores user and token', () => {
      const registerData = {
        email: 'new@test.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.PATIENT,
      };

      service.register(registerData).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      req.flush({
        success: true,
        data: { user: mockUser, accessToken: 'tok', mfaRequired: false },
      });

      expect(storageServiceSpy.setTokens).toHaveBeenCalledWith('tok');
    });

    it('AuthService — register — MFA required — does not call handleAuthSuccess', () => {
      service.register({ email: 'a@b.com', password: 'P', confirmPassword: 'P', firstName: 'A', lastName: 'B', role: UserRole.PATIENT }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      req.flush({ success: true, data: { mfaRequired: true, tempToken: 'tmp' } });

      expect(storageServiceSpy.setTokens).not.toHaveBeenCalled();
    });

    it('AuthService — registerPatient — success — stores user', () => {
      const patientData = {
        email: 'pt@test.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        firstName: 'Pat',
        lastName: 'Ient',
        dateOfBirth: '1990-01-01',
        gender: 'male' as const,
      };

      service.registerPatient(patientData).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register/patient`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: { user: mockUser, accessToken: 'tok', mfaRequired: false } });

      expect(storageServiceSpy.setUser).toHaveBeenCalled();
    });

    it('AuthService — registerDoctor — success — stores user', () => {
      const doctorData = {
        email: 'dr@test.com',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        firstName: 'Doc',
        lastName: 'Tor',
        specialization: 'Cardiology',
        licenseNumber: 'LIC123',
        yearsOfExperience: 5,
        consultationFee: 100,
      };

      service.registerDoctor(doctorData).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register/doctor`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: { user: mockUser, accessToken: 'tok', mfaRequired: false } });

      expect(storageServiceSpy.setUser).toHaveBeenCalled();
    });
  });

  describe('MFA', () => {
    it('AuthService — verifyMfaLogin — success — stores user', () => {
      service.verifyMfaLogin('tmp-token', '123456').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-mfa`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ tempToken: 'tmp-token', token: '123456' });
      req.flush({ success: true, data: { user: mockUser, accessToken: 'tok', mfaRequired: false } });

      expect(storageServiceSpy.setUser).toHaveBeenCalled();
    });

    it('AuthService — setupMfa — returns QR code URL and secret', () => {
      service.setupMfa().subscribe((res) => {
        expect(res.data.qrCodeUrl).toBe('otpauth://...');
        expect(res.data.secret).toBe('ABCDEF');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/setup-mfa`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: { qrCodeUrl: 'otpauth://...', secret: 'ABCDEF' } });
    });

    it('AuthService — verifySetupMfa — success — returns success response', () => {
      service.verifySetupMfa('654321').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-setup-mfa`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: '654321' });
      req.flush({ success: true });
    });
  });

  describe('Email Verification', () => {
    it('AuthService — verifyEmail — sends token in POST body', () => {
      service.verifyEmail('verify-token').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/verify-email`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'verify-token' });
      req.flush({ success: true });
    });

    it('AuthService — resendVerificationEmail — sends email in body', () => {
      service.resendVerificationEmail('user@test.com').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/resend-verification`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com' });
      req.flush({ success: true });
    });
  });

  describe('Password Reset', () => {
    it('AuthService — forgotPassword — sends email in body', () => {
      service.forgotPassword('user@test.com').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com' });
      req.flush({ success: true });
    });

    it('AuthService — resetPassword — sends token and newPassword', () => {
      service.resetPassword('reset-tok', 'NewPass1!').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'reset-tok', newPassword: 'NewPass1!' });
      req.flush({ success: true });
    });
  });

  describe('Token Refresh', () => {
    it('AuthService — refreshToken — success — stores new access token', () => {
      service.refreshToken().subscribe((res) => {
        expect(res.data.accessToken).toBe('new-token');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ data: { accessToken: 'new-token' } });

      expect(storageServiceSpy.setTokens).toHaveBeenCalledWith('new-token');
    });

    it('AuthService — refreshToken — failure — clears auth and propagates error', () => {
      service.refreshToken().subscribe({
        error: () => {
          expect(storageServiceSpy.clearAuth).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh-token`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('hasRole — array overload', () => {
    it('AuthService — hasRole with array — user role is in array — returns true', () => {
      (service as unknown as { currentUserSignal: { set: (v: User | null) => void } }).currentUserSignal.set(mockUser);
      expect(service.hasRole([UserRole.PATIENT, UserRole.DOCTOR])).toBeTrue();
    });

    it('AuthService — hasRole with array — user role not in array — returns false', () => {
      (service as unknown as { currentUserSignal: { set: (v: User | null) => void } }).currentUserSignal.set(mockUser);
      expect(service.hasRole([UserRole.DOCTOR, UserRole.ADMIN])).toBeFalse();
    });
  });

  describe('Logout — error path', () => {
    it('AuthService — logout — HTTP error — still clears auth', () => {
      service.logout();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(storageServiceSpy.clearAuth).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });
});
