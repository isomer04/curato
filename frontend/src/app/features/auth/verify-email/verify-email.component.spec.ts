import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { VerifyEmailComponent } from './verify-email.component';
import { AuthService } from '../../../core/services/auth.service';

describe('VerifyEmailComponent', () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const buildActivatedRoute = (token: string | null) => ({
    snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
  });

  const setup = async (token: string | null) => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['verifyEmail']);

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: buildActivatedRoute(token) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
  };

  describe('when no token is present in URL', () => {
    beforeEach(async () => {
      await setup(null);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should show no-token state', () => {
      expect(component['state']()).toBe('no-token');
    });

    it('should not call verifyEmail', () => {
      expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
    });

    it('should render Login button', () => {
      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('a[routerLink]')?.textContent).toContain('Go to Login');
    });
  });

  describe('when verification succeeds', () => {
    beforeEach(async () => {
      await setup('valid-token-abc');
      mockAuthService.verifyEmail.and.returnValue(
        of({ success: true, message: 'Email verified successfully. You can now log in.' }),
      );
      fixture.detectChanges();
    });

    it('should call verifyEmail with the token from query params', () => {
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-token-abc');
    });

    it('should show success state', () => {
      expect(component['state']()).toBe('success');
    });

    it('should display the success message', () => {
      expect(component['message']()).toBe(
        'Email verified successfully. You can now log in.',
      );
    });

    it('should render Login button', () => {
      fixture.detectChanges();
      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('a[routerLink]')?.textContent?.trim()).toBe('Go to Login');
    });
  });

  describe('when verification fails (expired or invalid token)', () => {
    beforeEach(async () => {
      await setup('expired-token-xyz');
      mockAuthService.verifyEmail.and.returnValue(
        throwError(() => ({
          error: { message: 'Email verification token has expired. Please request a new one.' },
        })),
      );
      fixture.detectChanges();
    });

    it('should show error state', () => {
      expect(component['state']()).toBe('error');
    });

    it('should display the error message from the backend', () => {
      expect(component['message']()).toBe(
        'Email verification token has expired. Please request a new one.',
      );
    });

    it('should render Login button', () => {
      fixture.detectChanges();
      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('a[routerLink]')?.textContent?.trim()).toBe('Go to Login');
    });
  });

  describe('when server returns error without message body', () => {
    beforeEach(async () => {
      await setup('bad-token');
      mockAuthService.verifyEmail.and.returnValue(throwError(() => ({})));
      fixture.detectChanges();
    });

    it('should fall back to generic error message', () => {
      expect(component['message']()).toBe(
        'This verification link is invalid or has expired. Please request a new one.',
      );
    });
  });
});
