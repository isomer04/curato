/**
 * LoginComponent Unit Tests
 *
 * Tests for the login component functionality.
 * Covers:
 * - Component creation
 * - Form validation
 * - Login submission
 * - Demo account functionality
 * - Password visibility toggle
 */
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserRole } from '../../../core/models';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  // Writable signal so the login mock can update it in-place (as the real AuthService does)
  let currentUserSignal: WritableSignal<{ role: UserRole } | null>;

  beforeEach(async () => {
    currentUserSignal = signal<{ role: UserRole } | null>(null);

    mockAuthService = jasmine.createSpyObj('AuthService', ['login'], {
      currentUser: currentUserSignal,
    });

    mockNotificationService = jasmine.createSpyObj('NotificationService', [
      'success',
      'error',
      'info',
    ]);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('should have an invalid form when empty', () => {
      expect(component['loginForm'].valid).toBeFalse();
    });

    it('should require email', () => {
      const emailControl = component['loginForm'].get('email');
      expect(emailControl?.errors?.['required']).toBeTrue();
    });

    it('should validate email format', () => {
      const emailControl = component['loginForm'].get('email');
      emailControl?.setValue('invalid-email');
      expect(emailControl?.errors?.['email']).toBeTrue();
    });

    it('should require password', () => {
      const passwordControl = component['loginForm'].get('password');
      expect(passwordControl?.errors?.['required']).toBeTrue();
    });

    it('should enforce minimum password length', () => {
      const passwordControl = component['loginForm'].get('password');
      passwordControl?.setValue('short');
      expect(passwordControl?.errors?.['minlength']).toBeTruthy();
    });

    it('should be valid with correct inputs', () => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123',
      });
      expect(component['loginForm'].valid).toBeTrue();
    });
  });

  describe('login submission', () => {
    beforeEach(() => {
      component['loginForm'].patchValue({
        email: 'test@example.com',
        password: 'ValidPassword123',
      });
    });

    const makeSuccessResponse = (role: UserRole) => ({
      success: true,
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          role: role,
          firstName: 'Test',
          lastName: 'User',
          isActive: true,
          isEmailVerified: true,
          mfaEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: 'token',
      },
      message: 'Success',
    });

    it('should redirect to patient dashboard for patient role', fakeAsync(() => {
      // Simulate what AuthService.handleAuthSuccess does — update the currentUser signal
      mockAuthService.login.and.callFake(() => {
        currentUserSignal.set({ role: UserRole.PATIENT });
        return of(makeSuccessResponse(UserRole.PATIENT));
      });
      const routerSpy = spyOn(component['router'], 'navigate');

      component['onSubmit']();
      tick();

      expect(routerSpy).toHaveBeenCalledWith(['/patient/dashboard']);
    }));

    it('should redirect to doctor dashboard for doctor role', fakeAsync(() => {
      mockAuthService.login.and.callFake(() => {
        currentUserSignal.set({ role: UserRole.DOCTOR });
        return of(makeSuccessResponse(UserRole.DOCTOR));
      });
      const routerSpy = spyOn(component['router'], 'navigate');

      component['onSubmit']();
      tick();

      expect(routerSpy).toHaveBeenCalledWith(['/doctor/dashboard']);
    }));

    it('should redirect to admin dashboard for admin role', fakeAsync(() => {
      mockAuthService.login.and.callFake(() => {
        currentUserSignal.set({ role: UserRole.ADMIN });
        return of(makeSuccessResponse(UserRole.ADMIN));
      });
      const routerSpy = spyOn(component['router'], 'navigate');

      component['onSubmit']();
      tick();

      expect(routerSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    }));

    it('should handle login error', fakeAsync(() => {
      mockAuthService.login.and.returnValue(
        throwError(() => ({ error: { message: 'Invalid credentials' } })),
      );
      const loggerSpy = spyOn(component['logger'], 'error');

      component['onSubmit']();
      tick();

      expect(component['isLoading']()).toBeFalse();
      expect(loggerSpy).toHaveBeenCalledWith('Login failed:', jasmine.any(Object));
    }));
  });

  describe('demo accounts', () => {
    it('should fill form when demo account is selected', () => {
      const demoAccount = component['demoAccounts'][0];
      component['useDemoAccount'](demoAccount);
      expect(component['loginForm'].get('email')?.value).toBe(demoAccount.email);
    });

    it('should show info notification when demo account is selected', () => {
      component['useDemoAccount'](component['demoAccounts'][0]);
      expect(mockNotificationService.info).toHaveBeenCalled();
    });
  });

  describe('password visibility', () => {
    it('should toggle password visibility', () => {
      expect(component['showPassword']()).toBeFalse();
      component['togglePasswordVisibility']();
      expect(component['showPassword']()).toBeTrue();
    });
  });

  describe('onSubmit edge cases', () => {
    it('LoginComponent — onSubmit — invalid form — marks all touched', () => {
      component['loginForm'].reset();
      component['onSubmit']();
      expect(component['loginForm'].touched).toBeTrue();
    });

    it('LoginComponent — onSubmit — MFA required — sets mfaPending true', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({
        success: true,
        data: { mfaRequired: true, tempToken: 'tmp-tok' },
        message: 'MFA required',
      }));
      component['loginForm'].patchValue({ email: 'test@example.com', password: 'ValidPass1' });
      component['onSubmit']();
      tick();
      expect(component['mfaPending']()).toBeTrue();
      expect(component['tempMfaToken']()).toBe('tmp-tok');
      expect(mockNotificationService.info).toHaveBeenCalledWith('MFA Required', jasmine.any(String));
    }));

    it('LoginComponent — onSubmit — success but null user — navigates to root', fakeAsync(() => {
      mockAuthService.login.and.returnValue(of({
        success: true,
        data: { mfaRequired: false as const, user: null as never, accessToken: 'tok' },
        message: 'Success',
      }));
      // currentUser stays null
      const routerSpy = spyOn(component['router'], 'navigate');
      component['loginForm'].patchValue({ email: 'test@example.com', password: 'ValidPass1' });
      component['onSubmit']();
      tick();
      expect(routerSpy).toHaveBeenCalledWith(['/']);
    }));
  });

  describe('onVerifyMfa', () => {
    it('LoginComponent — onVerifyMfa — invalid form — marks all touched', () => {
      component['mfaForm'].reset();
      component['onVerifyMfa']();
      expect(component['mfaForm'].touched).toBeTrue();
    });

    it('LoginComponent — onVerifyMfa — success — navigates with user role', fakeAsync(() => {
      // Stub verifyMfaLogin on the spy
      (mockAuthService as unknown as { verifyMfaLogin: jasmine.Spy }).verifyMfaLogin =
        jasmine.createSpy('verifyMfaLogin').and.callFake(() => {
          currentUserSignal.set({ role: UserRole.PATIENT });
          return of({ success: true, data: {}, message: 'ok' });
        });
      const routerSpy = spyOn(component['router'], 'navigate');
      component['tempMfaToken'].set('tmp-tok');
      component['mfaForm'].patchValue({ code: '123456' });
      component['onVerifyMfa']();
      tick();
      expect(routerSpy).toHaveBeenCalled();
    }));

    it('LoginComponent — onVerifyMfa — success null user — navigates to root', fakeAsync(() => {
      (mockAuthService as unknown as { verifyMfaLogin: jasmine.Spy }).verifyMfaLogin =
        jasmine.createSpy('verifyMfaLogin').and.returnValue(of({ success: true, data: {}, message: 'ok' }));
      const routerSpy = spyOn(component['router'], 'navigate');
      // currentUser stays null
      component['tempMfaToken'].set('tmp-tok');
      component['mfaForm'].patchValue({ code: '123456' });
      component['onVerifyMfa']();
      tick();
      expect(routerSpy).toHaveBeenCalledWith(['/']);
    }));

    it('LoginComponent — onVerifyMfa — error — resets isLoading', fakeAsync(() => {
      (mockAuthService as unknown as { verifyMfaLogin: jasmine.Spy }).verifyMfaLogin =
        jasmine.createSpy('verifyMfaLogin').and.returnValue(throwError(() => new Error('Bad')));
      component['tempMfaToken'].set('tmp-tok');
      component['mfaForm'].patchValue({ code: '123456' });
      component['onVerifyMfa']();
      tick();
      expect(component['isLoading']()).toBeFalse();
    }));
  });

  describe('hasError', () => {
    it('LoginComponent — hasError mfa form — touched invalid code — returns true', () => {
      const codeCtrl = component['mfaForm'].get('code')!;
      codeCtrl.markAsTouched();
      codeCtrl.setValue('');
      expect(component['hasError']('code', 'required', 'mfa')).toBeTrue();
    });

    it('LoginComponent — hasError login form — untouched — returns false', () => {
      expect(component['hasError']('email', 'required', 'login')).toBeFalse();
    });
  });
});
