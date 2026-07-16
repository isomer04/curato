/**
 * DoctorDashboardComponent
 *
 * The main dashboard view for doctor users displaying:
 * - Personalized greeting based on time of day
 * - Today's appointment count and schedule
 * - Statistics (pending confirmations, completed this week, total patients)
 * - Quick action buttons for common tasks
 * - Today's appointment schedule table
 *
 * This component uses signal-based state management and loads data on initialization.
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
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { LoggerService } from '../../../core/services/logger.service';
import { AppointmentStatus, Appointment } from '../../../core/models';
import {
  DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT,
  TEXT_TRUNCATE_LENGTH,
} from '../../../core/constants';
import { StatusBadgePipe } from '../../../shared/pipes/status-badge.pipe';

/**
 * Interface for doctor dashboard statistics.
 */
interface DoctorStats {
  todayCount: number;
  pendingConfirmation: number;
  completedThisWeek: number;
  totalPatients: number;
}

/**
 * Quick action configuration interface.
 */
interface QuickAction {
  route: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  imports: [CommonModule, RouterModule, StatusBadgePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Component-level provider creates an isolated AppointmentService instance
  // so that getAppointments() calls here do not overwrite the shared global
  // appointmentsSignal consumed by other dashboard components (patient, list).
  providers: [AppointmentService],
})
export class DoctorDashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly appointmentService = inject(AppointmentService);

  private readonly logger = inject(LoggerService);

  /** Dashboard statistics */
  protected readonly stats = signal<DoctorStats>({
    todayCount: 0,
    pendingConfirmation: 0,
    completedThisWeek: 0,
    totalPatients: 0,
  });

  /** Text truncation length for table display */
  protected readonly truncateLength = TEXT_TRUNCATE_LENGTH;

  /** Today's date in ISO format for API queries */
  protected readonly today = new Date().toISOString().split('T')[0];

  /** Loading state — starts true so no zero-flash before first data load */
  protected readonly isLoading = signal(true);

  /** Today's appointments limited for dashboard display */
  protected readonly todaysAppointments = computed(() =>
    this.appointmentService
      .upcomingAppointments()
      .filter((apt) => apt.appointmentDate === this.today)
      .slice(0, DASHBOARD_UPCOMING_APPOINTMENTS_LIMIT),
  );

  /** Quick actions for the doctor dashboard */
  protected readonly quickActions: QuickAction[] = [
    { route: '/doctor/appointments', label: 'View All Appointments', icon: 'bi-calendar-week' },
    { route: '/doctor/schedule', label: 'Manage Availability', icon: 'bi-clock-history' },
    { route: '/doctor/patients', label: 'Patient List', icon: 'bi-people' },
    { route: '/profile', label: 'Update Profile', icon: 'bi-person-gear' },
  ];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Load all dashboard data including appointments and calculate statistics.
   */
  protected loadDashboardData(): void {
    this.appointmentService
      .getAppointments({
        limit: 100,
        startDate: this.today,
      })
      .subscribe({
        next: (response) => {
          this.calculateStats(response.data);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.logger.error('Failed to load dashboard data:', error);
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Calculate dashboard statistics from appointments.
   */
  private calculateStats(appointments: Appointment[]): void {
    const stats: DoctorStats = {
      todayCount: 0,
      pendingConfirmation: 0,
      completedThisWeek: 0,
      totalPatients: 0,
    };

    const uniquePatients = new Set<string>();

    appointments.forEach((apt) => {
      // Count today's appointments
      if (apt.appointmentDate === this.today) {
        stats.todayCount++;
      }

      // Count pending confirmations
      if (apt.status === AppointmentStatus.SCHEDULED) {
        stats.pendingConfirmation++;
      }

      // Count completed this week
      if (apt.status === AppointmentStatus.COMPLETED) {
        stats.completedThisWeek++;
      }

      // Track unique patients
      if (apt.patientId) {
        uniquePatients.add(apt.patientId);
      }
    });

    stats.totalPatients = uniquePatients.size;
    this.stats.set(stats);
  }

  /**
   * Get time-based greeting message.
   */
  protected getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * Get patient initials for avatar display.
   */
  protected getPatientInitials(appointment: Appointment): string {
    const firstName = appointment.patient?.user?.firstName ?? '';
    const lastName = appointment.patient?.user?.lastName ?? '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Get patient full name.
   */
  protected getPatientName(appointment: Appointment): string {
    const firstName = appointment.patient?.user?.firstName ?? '';
    const lastName = appointment.patient?.user?.lastName ?? '';
    return `${firstName} ${lastName}`.trim();
  }
}
