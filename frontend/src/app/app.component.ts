/**
 * AppComponent
 *
 * The root component of the Healthcare Appointment System.
 *
 * This component:
 * - Provides the main application layout structure
 * - Includes the navbar and footer on all pages
 * - Contains the router outlet for page content
 * - Hosts the toast notification container
 *
 * Layout Structure:
 * - Navbar (sticky at top)
 * - Main content area (router-outlet with scrollable content)
 * - Footer (pushed to bottom via flexbox)
 * - Toast notification container (fixed position)
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NotificationService } from './core/services/notification.service';
import { AuthService } from './core/services/auth.service';
import { ToastMessage } from './core/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  /** Notification service for toast messages */
  protected readonly notificationService = inject(NotificationService);

  /** Auth service for layout-switching (sidebar vs topbar) */
  protected readonly authService = inject(AuthService);

  /**
   * Dismiss a specific toast notification.
   * @param toast - The toast to dismiss
   */
  protected dismissToast(toast: ToastMessage): void {
    this.notificationService.removeToast(toast.id);
  }

  /**
   * Get the CSS class for toast styling based on type.
   * @param type - Toast type (success, error, warning, info)
   */
  protected getToastClass(type: string): string {
    const classes: Record<string, string> = {
      success: 'toast-success',
      error: 'toast-error',
      warning: 'toast-warning',
      info: 'toast-info',
    };
    return classes[type] || 'toast-info';
  }

  /**
   * Get the icon for toast based on type.
   * @param type - Toast type
   */
  protected getToastIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill',
    };
    return icons[type] || 'bi-info-circle-fill';
  }
}
