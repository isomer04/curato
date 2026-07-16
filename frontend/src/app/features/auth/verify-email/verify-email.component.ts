import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

type VerifyState = 'loading' | 'success' | 'error' | 'no-token';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  protected readonly state = signal<VerifyState>('loading');
  protected readonly message = signal<string>('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('no-token');
      this.message.set('No verification token found. Please use the link from your email.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.state.set('success');
        this.message.set(response.message ?? 'Email verified successfully. You can now log in.');
      },
      error: (error: { error?: { message?: string } }) => {
        this.state.set('error');
        this.message.set(
          error?.error?.message ??
            'This verification link is invalid or has expired. Please request a new one.',
        );
      },
    });
  }
}
