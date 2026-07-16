import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { User, UserRole } from '../../core/models';
import { signal } from '@angular/core';

/** Exposes protected members for tests without scattering `as any`. */
interface ProfileTestHarness {
  profileForm: FormGroup;
  emailChangeForm: FormGroup;
  isEditMode: () => boolean;
  isSaving: () => boolean;
  emailChangeSent: () => boolean;
  enterEditMode: () => void;
  saveProfile: () => void;
  enterEmailChangeMode: () => void;
  requestEmailChange: () => void;
  goBack: () => void;
  goToMfa: () => void;
}

function profileHarness(c: ProfileComponent): ProfileTestHarness {
  return c as unknown as ProfileTestHarness;
}

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@test.com',
    role: UserRole.PATIENT,
    phoneNumber: '1234567890',
    isActive: true,
    isEmailVerified: true,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj(
      'AuthService',
      ['getProfile', 'updateProfile', 'requestEmailChange'],
      { currentUser: signal(mockUser) }
    );
    Object.assign(authServiceSpy, {
      userRole: () => UserRole.PATIENT,
    });

    authServiceSpy.getProfile.and.returnValue(of({ data: mockUser }));

    notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });


  describe('Initialization — happy path', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize forms with user data if user signal is populated', () => {
      const h = profileHarness(component);
      expect(h.profileForm.value).toEqual({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '1234567890',
      });
    });
  });

  describe('Initialization — edge cases', () => {
    it('should call loadProfile if currentUser is initially null', () => {
      Object.defineProperty(authServiceSpy, 'currentUser', { value: signal(null) });

      const newFixture = TestBed.createComponent(ProfileComponent);
      newFixture.detectChanges();

      expect(newFixture).toBeTruthy();
      expect(authServiceSpy.getProfile).toHaveBeenCalled();
    });
  });

  describe('Initialization — error cases', () => {
    it('should show error notification if loadProfile fails', () => {
      Object.defineProperty(authServiceSpy, 'currentUser', { value: signal(null) });
      authServiceSpy.getProfile.and.returnValue(throwError(() => new Error('Network error')));

      const newFixture = TestBed.createComponent(ProfileComponent);
      newFixture.detectChanges();

      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error', 'Failed to load user profile');
    });
  });


  describe('Profile Update — happy path', () => {
    it('should update profile successfully', () => {
      const h = profileHarness(component);
      h.enterEditMode();
      h.profileForm.patchValue({
        firstName: 'Updated',
        lastName: 'Name',
      });
      authServiceSpy.updateProfile.and.returnValue(of({ data: mockUser }));

      h.saveProfile();

      expect(authServiceSpy.updateProfile).toHaveBeenCalledWith({
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '1234567890',
      });
      expect(notificationServiceSpy.success).toHaveBeenCalledWith('Saved', 'Profile updated successfully');
      expect(h.isEditMode()).toBeFalse();
    });

    it('should pass null when phoneNumber is empty', () => {
      const h = profileHarness(component);
      h.enterEditMode();
      h.profileForm.patchValue({ firstName: 'Jane', lastName: 'Doe', phoneNumber: '' });
      authServiceSpy.updateProfile.and.returnValue(of({ data: mockUser }));

      h.saveProfile();

      expect(authServiceSpy.updateProfile).toHaveBeenCalledWith(
        jasmine.objectContaining({ phoneNumber: null }),
      );
    });
  });

  describe('Profile Update — edge cases', () => {
    it('should not call updateProfile if the form is invalid', () => {
      const h = profileHarness(component);
      h.enterEditMode();
      h.profileForm.patchValue({ firstName: '' });

      h.saveProfile();

      expect(authServiceSpy.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('Profile Update — error cases', () => {
    it('should handle API errors when updating profile', () => {
      const h = profileHarness(component);
      h.enterEditMode();
      authServiceSpy.updateProfile.and.returnValue(throwError(() => ({ error: { message: 'Validation failed' } })));

      h.saveProfile();

      expect(h.isSaving()).toBeFalse();
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error', 'Validation failed');
    });
  });


  describe('Email Change — happy path', () => {
    it('should request an email change successfully', () => {
      const h = profileHarness(component);
      h.enterEmailChangeMode();
      h.emailChangeForm.patchValue({ newEmail: 'newemail@test.com' });
      authServiceSpy.requestEmailChange.and.returnValue(of({ success: true }));

      h.requestEmailChange();

      expect(authServiceSpy.requestEmailChange).toHaveBeenCalledWith('newemail@test.com');
      expect(h.emailChangeSent()).toBeTrue();
    });
  });

  describe('Email Change — edge cases', () => {
    it('should not request email change if form is invalid', () => {
      const h = profileHarness(component);
      h.enterEmailChangeMode();
      h.emailChangeForm.patchValue({ newEmail: 'invalid-email' });

      h.requestEmailChange();

      expect(authServiceSpy.requestEmailChange).not.toHaveBeenCalled();
    });
  });

  describe('Email Change — error cases', () => {
    it('should show error notification if email change request fails', () => {
      const h = profileHarness(component);
      h.enterEmailChangeMode();
      h.emailChangeForm.patchValue({ newEmail: 'newemail@test.com' });
      authServiceSpy.requestEmailChange.and.returnValue(
        throwError(() => ({ error: { message: 'Email already taken' } }))
      );

      h.requestEmailChange();

      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Error', 'Email already taken');
      expect(h.emailChangeSent()).toBeFalse();
    });
  });


  describe('Navigation', () => {
    it('should navigate back to correct dashboard based on role', () => {
      profileHarness(component).goBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/patient/dashboard']);
    });

    it('should navigate back to doctor dashboard for doctor role', () => {
      Object.assign(authServiceSpy, { userRole: () => UserRole.DOCTOR });
      profileHarness(component).goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/doctor/dashboard']);
    });

    it('should navigate back to admin dashboard for admin role', () => {
      Object.assign(authServiceSpy, { userRole: () => UserRole.ADMIN });
      profileHarness(component).goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
    });

    it('should navigate to patient dashboard for unknown role', () => {
      Object.assign(authServiceSpy, { userRole: () => null });
      profileHarness(component).goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/patient/dashboard']);
    });

    it('should navigate to MFA setup', () => {
      profileHarness(component).goToMfa();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile/mfa-setup']);
    });
  });


  describe('Cancel Operations', () => {
    it('should exit edit mode on cancelEditMode', () => {
      const h = profileHarness(component);
      h.enterEditMode();
      expect(h.isEditMode()).toBeTrue();
      (component as unknown as { cancelEditMode: () => void }).cancelEditMode();
      expect(h.isEditMode()).toBeFalse();
    });

    it('should reset email change state on cancelEmailChange', () => {
      const h = profileHarness(component);
      h.enterEmailChangeMode();
      (component as unknown as { cancelEmailChange: () => void }).cancelEmailChange();
      expect((component as unknown as { isEmailChangeMode: () => boolean }).isEmailChangeMode()).toBeFalse();
      expect(h.emailChangeSent()).toBeFalse();
    });
  });


  describe('getFieldError', () => {
    let h: ProfileTestHarness;

    beforeEach(() => {
      h = profileHarness(component);
      h.enterEditMode();
    });

    it('should return null when control does not exist', () => {
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(h.profileForm, 'nonExistentField');
      expect(result).toBeNull();
    });

    it('should return null when control is not touched', () => {
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(h.profileForm, 'firstName');
      expect(result).toBeNull();
    });

    it('should return null when control is touched but has no errors', () => {
      const ctrl = h.profileForm.get('phoneNumber');
      ctrl?.setValue('1234567890');
      ctrl?.markAsTouched();
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(h.profileForm, 'phoneNumber');
      expect(result).toBeNull();
    });

    it('should return "This field is required" for required error', () => {
      const ctrl = h.profileForm.get('firstName');
      ctrl?.setValue('');
      ctrl?.markAsTouched();
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(h.profileForm, 'firstName');
      expect(result).toBe('This field is required');
    });

    it('should return "Too long" for maxlength error', () => {
      const ctrl = h.profileForm.get('phoneNumber');
      ctrl?.setValue('1'.repeat(25)); // exceeds maxLength(20)
      ctrl?.markAsTouched();
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(h.profileForm, 'phoneNumber');
      expect(result).toBe('Too long');
    });

    it('should return "Invalid characters" for pattern error', () => {
      const ctrl = h.profileForm.get('firstName');
      ctrl?.setValue('John123'); // contains digits, fails pattern
      ctrl?.markAsTouched();
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(h.profileForm, 'firstName');
      expect(result).toBe('Invalid characters');
    });

    it('should return "Enter a valid email address" for email error', () => {
      const emailForm = (component as unknown as { emailChangeForm: FormGroup }).emailChangeForm;
      const ctrl = emailForm.get('newEmail');
      ctrl?.setValue('not-an-email');
      ctrl?.markAsTouched();
      const result = (component as unknown as { getFieldError: (f: FormGroup, field: string) => string | null })
        .getFieldError(emailForm, 'newEmail');
      expect(result).toBe('Enter a valid email address');
    });
  });
});
