import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.forgotPassword(this.form.value.email!).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.submitted.set(true);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  protected get emailInvalid(): boolean {
    const ctrl = this.form.get('email');
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
