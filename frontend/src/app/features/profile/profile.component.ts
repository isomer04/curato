import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  NonNullableFormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { LoggerService } from '../../core/services/logger.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, TitleCasePipe, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  private readonly logger = inject(LoggerService);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isRequestingEmailChange = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly isEmailChangeMode = signal(false);
  protected readonly emailChangeSent = signal(false);

  protected readonly user = this.authService.currentUser;

  protected readonly displayName = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName} ${u.lastName}`;
  });

  protected readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase();
  });


  protected profileForm!: FormGroup<{
    firstName: FormControl<string>;
    lastName: FormControl<string>;
    phoneNumber: FormControl<string>;
  }>;

  protected emailChangeForm!: FormGroup<{
    newEmail: FormControl<string>;
  }>;

  ngOnInit(): void {
    if (!this.user()) {
      this.loadProfile();
    }
    this.buildForms();
  }

  private buildForms(): void {
    const u = this.user();
    this.profileForm = this.fb.group({
      firstName: [
        u?.firstName ?? '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z\s'-]+$/),
        ],
      ],
      lastName: [
        u?.lastName ?? '',
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-Z\s'-]+$/),
        ],
      ],
      phoneNumber: [u?.phoneNumber ?? '', [Validators.maxLength(20)]],
    });

    this.emailChangeForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    });
  }

  protected loadProfile(): void {
    this.isLoading.set(true);
    this.authService.getProfile().subscribe({
      next: () => {
        this.isLoading.set(false);
        this.buildForms();
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.logger.error('Profile load error', err);
        this.notificationService.error('Error', 'Failed to load user profile');
      },
    });
  }


  protected enterEditMode(): void {
    const u = this.user();
    if (u) {
      this.profileForm.patchValue({
        firstName: u.firstName,
        lastName: u.lastName,
        phoneNumber: u.phoneNumber ?? '',
      });
    }
    this.isEditMode.set(true);
    this.isEmailChangeMode.set(false);
  }

  protected cancelEditMode(): void {
    this.isEditMode.set(false);
    this.profileForm.reset();
    this.buildForms();
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const { firstName, lastName, phoneNumber } = this.profileForm.getRawValue();
    this.authService
      .updateProfile({ firstName, lastName, phoneNumber: phoneNumber || null })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isEditMode.set(false);
          this.notificationService.success('Saved', 'Profile updated successfully');
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSaving.set(false);
          this.notificationService.error(
            'Error',
            err?.error?.message ?? 'Failed to update profile',
          );
        },
      });
  }


  protected enterEmailChangeMode(): void {
    this.isEmailChangeMode.set(true);
    this.isEditMode.set(false);
    this.emailChangeSent.set(false);
    this.emailChangeForm.reset();
  }

  protected cancelEmailChange(): void {
    this.isEmailChangeMode.set(false);
    this.emailChangeSent.set(false);
    this.emailChangeForm.reset();
  }

  protected requestEmailChange(): void {
    if (this.emailChangeForm.invalid) {
      this.emailChangeForm.markAllAsTouched();
      return;
    }
    this.isRequestingEmailChange.set(true);
    const { newEmail } = this.emailChangeForm.getRawValue();
    this.authService.requestEmailChange(newEmail).subscribe({
      next: () => {
        this.isRequestingEmailChange.set(false);
        this.emailChangeSent.set(true);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isRequestingEmailChange.set(false);
        this.notificationService.error(
          'Error',
          err?.error?.message ?? 'Failed to request email change',
        );
      },
    });
  }


  protected goToMfa(): void {
    this.router.navigate(['/profile/mfa-setup']);
  }

  protected goBack(): void {
    const role = this.authService.userRole();
    switch (role) {
      case UserRole.PATIENT:
        this.router.navigate(['/patient/dashboard']);
        break;
      case UserRole.DOCTOR:
        this.router.navigate(['/doctor/dashboard']);
        break;
      case UserRole.ADMIN:
        this.router.navigate(['/admin/dashboard']);
        break;
      default:
        this.router.navigate(['/patient/dashboard']);
    }
  }


  protected getFieldError(form: FormGroup, field: string): string | null {
    const control = form.get(field);
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return 'Too short';
    if (control.errors['maxlength']) return 'Too long';
    if (control.errors['pattern']) return 'Invalid characters';
    if (control.errors['email']) return 'Enter a valid email address';
    return 'Invalid value';
  }
}
