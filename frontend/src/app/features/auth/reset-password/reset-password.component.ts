import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '../../../core/constants';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmPassword')?.value as string;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly done = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  private token = '';

  protected readonly form = this.fb.group(
    {
      newPassword: [
        '',
        [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH), Validators.maxLength(MAX_PASSWORD_LENGTH)],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('Invalid or missing reset token. Please request a new reset link.');
    }
  }

  protected submitForm(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.resetPassword(this.token, this.form.value.newPassword!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message ?? 'Reset failed. The link may have expired. Please request a new one.',
        );
      },
    });
  }

  protected fieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  protected get mismatch(): boolean {
    return !!(this.form.errors?.['passwordsMismatch'] && this.form.get('confirmPassword')?.touched);
  }
}
