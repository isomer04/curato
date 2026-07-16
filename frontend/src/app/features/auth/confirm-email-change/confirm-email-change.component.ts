import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-confirm-email-change',
  imports: [CommonModule],
  templateUrl: './confirm-email-change.component.html',
  styleUrl: './confirm-email-change.component.scss',
})
export class ConfirmEmailChangeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string>('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.errorMessage.set('No confirmation token provided.');
      return;
    }

    this.confirmEmail(token);
  }

  private confirmEmail(token: string): void {
    this.authService.confirmEmailChange(token).subscribe({
      next: () => {
        this.status.set('success');
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(
          err?.error?.message || 'Failed to confirm email change. The link may have expired.',
        );
      },
    });
  }

  goToLogin(): void {
    // The backend logged the user out globally during email change. They need to login again.
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
