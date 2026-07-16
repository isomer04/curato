import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoggerService } from '../../../core/services/logger.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mfa-setup',
  imports: [ReactiveFormsModule],
  templateUrl: './mfa-setup.component.html',
  styleUrl: './mfa-setup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaSetupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly isVerifying = signal(false);
  protected readonly qrCodeUrl = signal('');
  protected readonly secret = signal('');

  protected readonly mfaForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  protected initializeSetup(): void {
    this.isLoading.set(true);
    this.authService.setupMfa().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          this.qrCodeUrl.set(response.data.qrCodeUrl);
          this.secret.set(response.data.secret);
        }
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.notificationService.error('Error', 'Failed to initialize MFA setup.');
        this.logger.error('MFA setup error', error);
      },
    });
  }

  protected verifySetup(): void {
    if (this.mfaForm.invalid) return;

    this.isVerifying.set(true);
    const code = this.mfaForm.getRawValue().code;

    this.authService.verifySetupMfa(code).subscribe({
      next: () => {
        this.isVerifying.set(false);
        this.notificationService.success('Success', 'MFA has been successfully enabled.');
        this.goBack();
      },
      error: (error: unknown) => {
        this.isVerifying.set(false);
        this.notificationService.error('Error', 'Invalid or expired code. Please try again.');
        this.logger.error('MFA verification error', error);
      },
    });
  }

  protected goBack(): void {
    const userRole = this.authService.userRole();
    if (userRole) {
      this.router.navigate([`/${userRole}/dashboard`]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
