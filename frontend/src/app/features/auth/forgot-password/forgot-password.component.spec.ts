import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['forgotPassword']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Form validation
  describe('ForgotPasswordComponent — form validation', () => {
    it('ForgotPasswordComponent — empty email — form is invalid', () => {
      expect(component['form'].valid).toBeFalse();
    });

    it('ForgotPasswordComponent — malformed email — form is invalid', () => {
      component['form'].get('email')!.setValue('not-an-email');
      expect(component['form'].get('email')!.errors?.['email']).toBeTrue();
    });

    it('ForgotPasswordComponent — valid email — form is valid', () => {
      component['form'].get('email')!.setValue('user@example.com');
      expect(component['form'].valid).toBeTrue();
    });

    it('ForgotPasswordComponent — emailInvalid getter — returns false when untouched', () => {
      component['form'].get('email')!.setValue('bad');
      expect(component['emailInvalid']).toBeFalse();
    });

    it('ForgotPasswordComponent — emailInvalid getter — returns true when touched and invalid', () => {
      component['form'].get('email')!.setValue('bad');
      component['form'].get('email')!.markAsTouched();
      expect(component['emailInvalid']).toBeTrue();
    });
  });

  // Submission — happy path
  describe('ForgotPasswordComponent — submission — happy path', () => {
    it('ForgotPasswordComponent — valid email submitted — calls forgotPassword with email', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(of({ success: true }));
      component['form'].get('email')!.setValue('user@example.com');

      component['submitForm']();
      tick();

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith('user@example.com');
    }));

    it('ForgotPasswordComponent — valid email submitted — sets submitted to true', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(of({ success: true }));
      component['form'].get('email')!.setValue('user@example.com');

      component['submitForm']();
      tick();

      expect(component['submitted']()).toBeTrue();
    }));

    it('ForgotPasswordComponent — valid email submitted — sets isLoading to false after success', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(of({ success: true }));
      component['form'].get('email')!.setValue('user@example.com');

      component['submitForm']();
      tick();

      expect(component['isLoading']()).toBeFalse();
    }));
  });

  // Submission — error cases
  describe('ForgotPasswordComponent — submission — error cases', () => {
    it('ForgotPasswordComponent — service returns error with message — shows backend message', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(
        throwError(() => ({ error: { message: 'Account not found' } })),
      );
      component['form'].get('email')!.setValue('unknown@example.com');

      component['submitForm']();
      tick();

      expect(component['errorMessage']()).toBe('Account not found');
      expect(component['submitted']()).toBeFalse();
    }));

    it('ForgotPasswordComponent — service returns error without message — shows fallback message', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(throwError(() => ({})));
      component['form'].get('email')!.setValue('user@example.com');

      component['submitForm']();
      tick();

      expect(component['errorMessage']()).toBe('Something went wrong. Please try again.');
    }));

    it('ForgotPasswordComponent — service error — sets isLoading to false', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(throwError(() => ({})));
      component['form'].get('email')!.setValue('user@example.com');

      component['submitForm']();
      tick();

      expect(component['isLoading']()).toBeFalse();
    }));
  });

  // Edge cases
  describe('ForgotPasswordComponent — edge cases', () => {
    it('ForgotPasswordComponent — submit with empty form — marks form touched without calling service', () => {
      component['submitForm']();
      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
      expect(component['form'].get('email')!.touched).toBeTrue();
    });

    it('ForgotPasswordComponent — submit with whitespace-only email — form is invalid', () => {
      component['form'].get('email')!.setValue('   ');
      component['submitForm']();
      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });

    it('ForgotPasswordComponent — submit success then resubmit — error message cleared on second attempt', fakeAsync(() => {
      mockAuthService.forgotPassword.and.returnValue(throwError(() => ({ error: { message: 'fail' } })));
      component['form'].get('email')!.setValue('user@example.com');
      component['submitForm']();
      tick();
      expect(component['errorMessage']()).toBe('fail');

      mockAuthService.forgotPassword.and.returnValue(of({ success: true }));
      component['submitted'].set(false);
      component['submitForm']();
      tick();
      expect(component['errorMessage']()).toBe('');
    }));
  });
});
