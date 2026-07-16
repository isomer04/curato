/**
 * AdminDashboardComponent
 *
 * The main dashboard for system administrators providing:
 * - System-wide statistics overview
 * - Quick access to management functions
 * - Summary of appointments and user activity
 *
 * Note: In a production environment, these statistics would be fetched
 * from dedicated admin API endpoints with proper authorization.
 */
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { LoggerService } from '../../../core/services/logger.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SystemStats, AppointmentBreakdown, UserStats, QuickAction } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);

  /** System-wide statistics */
  protected readonly stats = signal<SystemStats>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
  });

  /** Today's appointment breakdown */
  protected readonly appointmentBreakdown = signal<AppointmentBreakdown>({
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  });

  /** User activity statistics */
  protected readonly userStats = signal<UserStats>({
    activeUsers: 0,
    newThisWeek: 0,
    pendingVerification: 0,
    inactive: 0,
  });

  /** Loading state */
  protected readonly isLoading = signal(true);

  /** Error state */
  protected readonly hasError = signal(false);

  /** Quick actions for the admin dashboard */
  protected readonly quickActions: QuickAction[] = [
    { route: '/admin/users', label: 'Manage Users', icon: 'bi-people' },
    { route: '/admin/doctors', label: 'Manage Doctors', icon: 'bi-person-badge' },
    { route: '/admin/appointments', label: 'All Appointments', icon: 'bi-calendar-week' },
    { route: '/admin/settings', label: 'System Settings', icon: 'bi-gear' },
    { route: '/admin/reports', label: 'View Reports', icon: 'bi-graph-up' },
  ];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load all dashboard statistics from the API.
   */
  protected loadDashboardData(): void {
    this.hasError.set(false);
    this.adminService.getDashboardStats().subscribe({
      next: (response) => {
        const { users, appointments } = response.data.stats;
        this.stats.set({
          totalUsers: users.total,
          totalDoctors: users.byRole['doctor'] ?? 0,
          totalPatients: users.byRole['patient'] ?? 0,
          totalAppointments: appointments.total,
        });
        this.appointmentBreakdown.set({
          scheduled: appointments.byStatus['scheduled'] ?? 0,
          confirmed: appointments.byStatus['confirmed'] ?? 0,
          completed: appointments.byStatus['completed'] ?? 0,
          cancelled: appointments.byStatus['cancelled'] ?? 0,
        });
        this.userStats.set({
          activeUsers: users.active,
          newThisWeek: 0,
          pendingVerification: users.unverified,
          inactive: users.inactive,
        });
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.logger.error('Failed to load admin dashboard stats:', error);
        this.notificationService.error('Error', 'Failed to load dashboard statistics');
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Retry loading dashboard data after an error.
   */
  protected retryLoad(): void {
    this.isLoading.set(true);
    this.loadDashboardData();
  }
}
