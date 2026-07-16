import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ResetPasswordComponent } from './reset-password.component';
import { AuthService } from '../../../core/services/auth.service';

function buildActivatedRoute(token: string | null) {
  return {
    snapshot: {
      queryParamMap: {
        get: (key: string) => (key === 'token' ? token : null),
      },
    },
  };
}

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let router: Router;

  async function setup(token: string | null = 'valid-token') {
    mockAuthService = jasmine.createSpyObj('AuthService', ['resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: buildActivatedRoute(token) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  // Initialisation
  describe('ResetPasswordComponent — initialisation', () => {
    it('ResetPasswordComponent — valid token in URL — no error on init', async () => {
      await setup('abc123');
      expect(component['errorMessage']()).toBe('');
    });

    it('ResetPasswordComponent — no token in URL — shows missing token error', async () => {
      await setup(null);
      expect(component['errorMessage']()).toContain('Invalid or missing reset token');
    });
  });

  // Form validation
  describe('ResetPasswordComponent — form validation', () => {
    beforeEach(async () => setup());

    it('ResetPasswordComponent — empty form — form is invalid', () => {
      expect(component['form'].valid).toBeFalse();
    });

    it('ResetPasswordComponent — password too short — minlength error present', () => {
      component['form'].get('newPassword')!.setValue('abc');
      expect(component['form'].get('newPassword')!.errors?.['minlength']).toBeTruthy();
    });

    it('ResetPasswordComponent — passwords do not match — mismatch error on group', () => {
      component['form'].patchValue({ newPassword: 'Password1!', confirmPassword: 'Different1!' });
      component['form'].get('confirmPassword')!.markAsTouched();
      expect(component['mismatch']).toBeTrue();
    });

    it('ResetPasswordComponent — matching passwords — no mismatch error', () => {
      component['form'].patchValue({ newPassword: 'Password1!', confirmPassword: 'Password1!' });
      component['form'].get('confirmPassword')!.markAsTouched();
      expect(component['mismatch']).toBeFalse();
    });

    it('ResetPasswordComponent — fieldInvalid — returns false when field is untouched', () => {
      component['form'].get('newPassword')!.setValue('');
      expect(component['fieldInvalid']('newPassword')).toBeFalse();
    });

    it('ResetPasswordComponent — fieldInvalid — returns true when field is touched and empty', () => {
      component['form'].get('newPassword')!.setValue('');
      component['form'].get('newPassword')!.markAsTouched();
      expect(component['fieldInvalid']('newPassword')).toBeTrue();
    });
  });

  // Submission — happy path
  describe('ResetPasswordComponent — submission — happy path', () => {
    beforeEach(async () => {
      await setup('my-token');
      // Stub navigation so tests that don't explicitly test it don't fail
      spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    });

    it('ResetPasswordComponent — valid form submitted — calls resetPassword with token and password', fakeAsync(() => {
      mockAuthService.resetPassword.and.returnValue(of({ success: true }));
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick();

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('my-token', 'NewPass1!');
    }));

    it('ResetPasswordComponent — reset succeeds — sets done to true', fakeAsync(() => {
      mockAuthService.resetPassword.and.returnValue(of({ success: true }));
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick();

      expect(component['done']()).toBeTrue();
    }));

    it('ResetPasswordComponent — reset succeeds — navigates to login after 3 seconds', fakeAsync(() => {
      mockAuthService.resetPassword.and.returnValue(of({ success: true }));
      // router.navigate is already spied in beforeEach — fetch the spy reference.
      const navSpy = router.navigate as jasmine.Spy;
      navSpy.calls.reset();
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick(3000);

      expect(navSpy).toHaveBeenCalledWith(['/auth/login']);
      discardPeriodicTasks();
    }));
  });

  // Submission — error cases
  describe('ResetPasswordComponent — submission — error cases', () => {
    beforeEach(async () => setup('my-token'));

    it('ResetPasswordComponent — service returns error with message — shows backend message', fakeAsync(() => {
      mockAuthService.resetPassword.and.returnValue(
        throwError(() => ({ error: { message: 'Token expired' } })),
      );
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick();

      expect(component['errorMessage']()).toBe('Token expired');
      expect(component['done']()).toBeFalse();
    }));

    it('ResetPasswordComponent — service returns error without message — shows fallback message', fakeAsync(() => {
      mockAuthService.resetPassword.and.returnValue(throwError(() => ({})));
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick();

      expect(component['errorMessage']()).toContain('Reset failed');
    }));

    it('ResetPasswordComponent — service error — sets isLoading to false', fakeAsync(() => {
      mockAuthService.resetPassword.and.returnValue(throwError(() => ({})));
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick();

      expect(component['isLoading']()).toBeFalse();
    }));
  });

  // Edge cases
  describe('ResetPasswordComponent — edge cases', () => {
    it('ResetPasswordComponent — no token and valid form — does not call resetPassword', fakeAsync(async () => {
      await setup(null);
      component['form'].patchValue({ newPassword: 'NewPass1!', confirmPassword: 'NewPass1!' });

      component['submitForm']();
      tick();

      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    }));

    it('ResetPasswordComponent — submit with invalid form — marks fields touched without calling service', async () => {
      await setup();
      component['submitForm']();
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
      expect(component['form'].get('newPassword')!.touched).toBeTrue();
    });

    it('ResetPasswordComponent — showPassword toggle — toggles visibility state', async () => {
      await setup();
      expect(component['showPassword']()).toBeFalse();
      component['showPassword'].set(true);
      expect(component['showPassword']()).toBeTrue();
    });
  });
});
