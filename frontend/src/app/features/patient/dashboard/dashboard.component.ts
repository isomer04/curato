/**
 * PatientDashboardComponent
 *
 * The main dashboard view for patient users. This component displays:
 * - Welcome message with personalized greeting
 * - Summary statistics (upcoming, completed, pending, cancelled appointments)
 * - Quick action buttons for common tasks
 * - List of upcoming appointments
 *
 * Architecture Notes:
 * - Uses Angular signals for reactive state management
 * - Implements OnInit for initial data loading
 * - Uses the AppointmentService to fetch appointment data
 * - All magic numbers are extracted to constants for maintainability
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { LoggerService } from '../../../core/services/logger.service';
import { Appointment } from '../../../core/models';
import { AppointmentStatusCounts } from '../../../core/models/dashboard.model';
import { DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT } from '../../../core/constants';
import { StatusBadgePipe } from '../../../shared/pipes/status-badge.pipe';

/**
 * Interface for dashboard statistics display.
 * Groups appointment counts by status for summary cards.
 */
interface DashboardStats {
  upcoming: number;
  completed: number;
  pending: number;
  cancelled: number;
}

@Component({
  selector: 'app-patient-dashboard',
  imports: [CommonModule, RouterModule, StatusBadgePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Component-level provider isolates appointmentsSignal from other components.
  providers: [AppointmentService],
})
export class PatientDashboardComponent implements OnInit {
  /** AuthService for accessing current user information */
  protected readonly authService = inject(AuthService);

  /** AppointmentService for fetching and managing appointments */
  protected readonly appointmentService = inject(AppointmentService);

  /** MedicalRecordService for accessing medical records */
  protected readonly medicalRecordService = inject(MedicalRecordService);

  private readonly logger = inject(LoggerService);

  /** Dashboard statistics signal, updated when appointments are loaded */
  protected readonly stats = signal<DashboardStats>({
    upcoming: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
  });

  /**
   * Triggers the download of medical records as CSV.
   */
  downloadRecords(): void {
    this.medicalRecordService.downloadMyRecordsCsv();
  }

  /**
   * Triggers the download of medical records as PDF.
   */
  downloadRecordsPdf(): void {
    this.medicalRecordService.downloadMyRecordsPdf();
  }

  /**
   * Computed signal for upcoming appointments to display.
   * Limited to a configurable number for dashboard display.
   */
  protected readonly displayedAppointments = computed(() =>
    this.appointmentService.upcomingAppointments().slice(0, DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT),
  );

  /** Loading state for the dashboard — starts true so no zero-flash before first data load */
  protected readonly isLoading = signal(true);

  /**
   * Quick action items for the patient dashboard.
   * Each action has a route, label, and icon for display.
   */
  protected readonly quickActions = [
    { route: '/patient/book', label: 'Book Appointment', icon: 'bi-calendar-plus' },
    { route: '/patient/appointments', label: 'View All Appointments', icon: 'bi-list-check' },
    { route: '/patient/medical-records', label: 'Medical Records', icon: 'bi-file-medical' },
    { route: '/profile', label: 'Update Profile', icon: 'bi-person-gear' },
  ];

  /**
   * Lifecycle hook - called after component initialization.
   * Triggers data loading for the dashboard.
   */
  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load dashboard stats and upcoming appointments in parallel.
   *
   * Uses forkJoin so both requests fire simultaneously:
   * - getDashboardStats() → tiny aggregate payload (just counts, no row data)
   * - getAppointments()  → only the handful of appointments needed for display
   *
   * This replaces the previous approach of fetching up to 100 full appointment
   * records just to count them client-side.
   */
  protected loadDashboardData(): void {
    forkJoin({
      stats: this.appointmentService.getDashboardStats(),
      upcoming: this.appointmentService.getAppointments({
        limit: DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT,
      }),
    }).subscribe({
      next: ({ stats }) => {
        this.updateStatsFromCounts(stats.data.stats);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.logger.error('Failed to load dashboard data:', error);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Populate dashboard summary cards from pre-aggregated counts.
   *
   * @param counts - Status counts returned by the dashboard-stats endpoint
   */
  private updateStatsFromCounts(counts: AppointmentStatusCounts): void {
    this.stats.set({
      upcoming: counts.confirmed + counts.scheduled,
      pending: counts.scheduled,
      completed: counts.completed,
      cancelled: counts.cancelled,
    });
  }

  /**
   * Get initials from a doctor's name for avatar display.
   *
   * @param appointment - The appointment containing doctor info
   * @returns Two-letter initials string
   */
  protected getDoctorInitials(appointment: Appointment): string {
    const firstName = appointment.doctor?.user?.firstName ?? '';
    const lastName = appointment.doctor?.user?.lastName ?? '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Get the full display name for a doctor.
   *
   * @param appointment - The appointment containing doctor info
   * @returns Formatted doctor name with "Dr." prefix
   */
  protected getDoctorName(appointment: Appointment): string {
    const firstName = appointment.doctor?.user?.firstName ?? '';
    const lastName = appointment.doctor?.user?.lastName ?? '';
    return `Dr. ${firstName} ${lastName}`.trim();
  }
}
