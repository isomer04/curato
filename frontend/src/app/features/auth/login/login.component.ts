/**
 * LoginComponent
 *
 * Handles user authentication via email and password.
 *
 * Features:
 * - Reactive form with validation
 * - Password visibility toggle
 * - Demo account quick-fill functionality
 * - Loading state management
 * - Error handling with user feedback
 *
 * Security considerations:
 * - Passwords are never logged or stored locally
 * - Failed attempts are rate-limited on the backend
 * - Uses httpOnly cookies for token storage (when configured)
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoggerService } from '../../../core/services/logger.service';
import { MIN_PASSWORD_LENGTH } from '../../../core/constants';

/**
 * Demo account credentials for testing purposes.
 * These are pre-seeded accounts in the development database.
 */
interface DemoAccount {
  email: string;
  password: string;
  role: string;
  description: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);

  /** Track whether the login request is in progress */
  protected readonly isLoading = signal(false);

  /** Toggle password field visibility */
  protected readonly showPassword = signal(false);

  /** Track MFA state */
  protected readonly mfaPending = signal(false);
  protected readonly tempMfaToken = signal('');

  /**
   * Demo accounts for quick testing.
   * Each account represents a different user role.
   */
  protected readonly demoAccounts: DemoAccount[] = [
    {
      email: 'patient@test.com',
      password: 'Password123!',
      role: 'Patient',
      description: 'Book and manage appointments',
    },
    {
      email: 'doctor@test.com',
      password: 'Password123!',
      role: 'Doctor',
      description: 'Manage schedule and patients',
    },
    {
      email: 'admin@test.com',
      password: 'Password123!',
      role: 'Admin',
      description: 'Full system access',
    },
  ];

  /**
   * Login form with email and password fields.
   *
   * Validators:
   * - Email: Required, must be valid email format
   * - Password: Required, minimum length enforced
   */
  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
    rememberMe: [false],
  });

  /**
   * MFA form for TOTP code validation.
   */
  protected readonly mfaForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  /**
   * Toggle password visibility between plain text and masked.
   */
  protected togglePasswordVisibility(): void {
    this.showPassword.update((show) => !show);
  }

  /**
   * Fill the login form with demo account credentials.
   *
   * @param account - The demo account to use
   */
  protected useDemoAccount(account: DemoAccount): void {
    this.loginForm.patchValue({
      email: account.email,
      password: account.password,
    });

    // Provide visual feedback that credentials were filled
    this.notificationService.info(
      'Demo Account Selected',
      `${account.role} credentials have been filled in.`,
    );
  }

  /**
   * Handle form submission and authenticate the user.
   *
   * Process:
   * 1. Validate form
   * 2. Call AuthService.login()
   * 3. Navigate to appropriate dashboard on success
   * 4. Show error notification on failure
   */
  protected onSubmit(): void {
    // Don't proceed if form is invalid
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const { email, password, rememberMe } = this.loginForm.getRawValue();

    this.authService.login({ email, password, rememberMe }).subscribe({
      next: (response) => {
        if (response.data.mfaRequired) {
          const { tempToken } = response.data;

          this.mfaPending.set(true);
          this.tempMfaToken.set(tempToken);
          this.isLoading.set(false);
          this.notificationService.info('MFA Required', 'Please enter your Authenticator code.');
          return;
        }

        this.isLoading.set(false);
        this.notificationService.success('Welcome!', 'You have successfully logged in.');

        // Navigate to appropriate dashboard based on user role
        const user = this.authService.currentUser();
        if (user) {
          this.router.navigate([`/${user.role}/dashboard`]);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error: unknown) => {
        this.isLoading.set(false);

        // Error notification is handled by the error interceptor
        // but we can add form-specific handling here if needed
        this.logger.error('Login failed:', error);
      },
    });
  }

  /**
   * Handle MFA verification.
   */
  protected onVerifyMfa(): void {
    if (this.mfaForm.invalid) {
      this.mfaForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const code = this.mfaForm.getRawValue().code;

    this.authService.verifyMfaLogin(this.tempMfaToken(), code).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notificationService.success('Welcome!', 'You have successfully logged in.');

        const user = this.authService.currentUser();
        if (user) {
          this.router.navigate([`/${user.role}/dashboard`]);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.logger.error('MFA verification failed:', error);
      },
    });
  }

  /**
   * Check if a form control has a specific validation error.
   * Used in the template for displaying validation messages.
   *
   * @param controlName - Name of the form control
   * @param errorName - Name of the validation error
   * @returns True if the control has the specified error and is touched
   */
  protected hasError(
    controlName: string,
    errorName: string,
    formName: 'login' | 'mfa' = 'login',
  ): boolean {
    const control =
      formName === 'login' ? this.loginForm.get(controlName) : this.mfaForm.get(controlName);
    return control ? control.hasError(errorName) && control.touched : false;
  }

  /**
   * Get the CSS class for form control validation state.
   *
   * @param controlName - Name of the form control
   * @returns 'is-invalid' if control has errors and is touched, empty string otherwise
   */
  protected getValidationClass(controlName: string, formName: 'login' | 'mfa' = 'login'): string {
    const control =
      formName === 'login' ? this.loginForm.get(controlName) : this.mfaForm.get(controlName);
    if (!control || !control.touched) return '';
    return control.invalid ? 'is-invalid' : 'is-valid';
  }
}
