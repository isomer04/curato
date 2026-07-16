/**
 * AppointmentListComponent
 *
 * Displays a list of the patient's appointments with filtering, sorting,
 * and action capabilities.
 *
 * Features:
 * - Filter by status (all, upcoming, completed, cancelled)
 * - Search by doctor name
 * - Cancel appointments with reason
 * - View appointment details
 * - Responsive table design
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { AppointmentStatus, Appointment } from '../../../../core/models';
import {
  MAX_PAGE_SIZE,
  MIN_CANCELLATION_REASON_LENGTH,
  TEXT_TRUNCATE_LENGTH,
} from '../../../../core/constants';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

/**
 * Filter options for appointment status.
 */
interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-appointment-list',
  imports: [CommonModule, RouterModule, FormsModule, StatusBadgePipe],
  templateUrl: './appointment-list.component.html',
  styleUrl: './appointment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppointmentListComponent implements OnInit {
  protected readonly appointmentService = inject(AppointmentService);
  protected readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);

  /** All appointments loaded from API */
  protected readonly allAppointments = signal<Appointment[]>([]);

  /** Currently selected filter */
  protected readonly selectedFilter = signal('all');

  /** Search term for doctor name */
  protected readonly searchTerm = signal('');

  /** Loading state */
  protected readonly isLoading = computed(() => this.appointmentService.isLoading());

  /** Appointment selected for cancellation */
  protected readonly selectedAppointment = signal<Appointment | null>(null);

  /** Cancellation reason input */
  protected readonly cancellationReason = signal('');

  /** Appointment selected to view details */
  protected readonly viewingAppointment = signal<Appointment | null>(null);

  /** Minimum cancellation reason length for UI validation */
  protected readonly minReasonLength = MIN_CANCELLATION_REASON_LENGTH;

  /** Text truncate length for reason display */
  protected readonly truncateLength = TEXT_TRUNCATE_LENGTH;

  /** Filter options for status dropdown */
  protected readonly filterOptions: FilterOption[] = [
    { value: 'all', label: 'All Appointments' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  /** Filtered appointments based on current filter and search */
  protected readonly filteredAppointments = computed(() => {
    let result = this.allAppointments();
    const filter = this.selectedFilter();
    const search = this.searchTerm().toLowerCase();

    // Apply status filter
    if (filter === 'upcoming') {
      result = result.filter(
        (apt) =>
          apt.status === AppointmentStatus.SCHEDULED || apt.status === AppointmentStatus.CONFIRMED,
      );
    } else if (filter === 'completed') {
      result = result.filter((apt) => apt.status === AppointmentStatus.COMPLETED);
    } else if (filter === 'cancelled') {
      result = result.filter((apt) => apt.status === AppointmentStatus.CANCELLED);
    }

    // Apply search filter
    if (search) {
      result = result.filter(
        (apt) =>
          apt.doctor?.user?.firstName?.toLowerCase().includes(search) ||
          apt.doctor?.user?.lastName?.toLowerCase().includes(search) ||
          apt.doctor?.specialization?.toLowerCase().includes(search),
      );
    }

    // Sort by date (newest first)
    return [...result].sort(
      (a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime(),
    );
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  /**
   * Load all patient appointments from the API.
   */
  protected loadAppointments(): void {
    this.appointmentService.getAppointments({ limit: MAX_PAGE_SIZE }).subscribe({
      next: (response) => {
        this.allAppointments.set(response.data);
      },
      error: (error) => {
        this.logger.error('Failed to load appointments:', error);
        this.notificationService.error('Error', 'Failed to load your appointments');
      },
    });
  }

  /**
   * Set the status filter.
   */
  protected setFilter(value: string): void {
    this.selectedFilter.set(value);
  }

  /**
   * Update search term.
   */
  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /**
   * Open the cancellation modal for an appointment.
   */
  protected openCancelModal(appointment: Appointment): void {
    this.selectedAppointment.set(appointment);
    this.cancellationReason.set('');
  }

  /**
   * Close the cancellation modal.
   */
  protected closeCancelModal(): void {
    this.selectedAppointment.set(null);
    this.cancellationReason.set('');
  }

  /**
   * Open the details modal.
   */
  protected openDetailsModal(appointment: Appointment): void {
    this.viewingAppointment.set(appointment);
  }

  /**
   * Close the details modal.
   */
  protected closeDetailsModal(): void {
    this.viewingAppointment.set(null);
  }

  /**
   * Confirm appointment cancellation.
   */
  protected confirmCancel(): void {
    const appointment = this.selectedAppointment();
    const reason = this.cancellationReason();

    if (!appointment || reason.length < MIN_CANCELLATION_REASON_LENGTH) {
      return;
    }

    this.appointmentService.cancelAppointment(appointment.id, reason).subscribe({
      next: () => {
        this.notificationService.success('Cancelled', 'Appointment cancelled successfully');
        this.closeCancelModal();
        this.loadAppointments();
      },
      error: (error) => {
        this.logger.error('Failed to cancel appointment:', error);
        this.notificationService.error('Error', 'Failed to cancel appointment');
      },
    });
  }

  /**
   * Check if an appointment can be cancelled.
   */
  protected canCancel(appointment: Appointment): boolean {
    return (
      appointment.status === AppointmentStatus.SCHEDULED ||
      appointment.status === AppointmentStatus.CONFIRMED
    );
  }

  /**
   * Get doctor initials for avatar.
   */
  protected getDoctorInitials(appointment: Appointment): string {
    const first = appointment.doctor?.user?.firstName?.charAt(0) ?? '';
    const last = appointment.doctor?.user?.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase();
  }

  /**
   * Get doctor full name.
   */
  protected getDoctorName(appointment: Appointment): string {
    const first = appointment.doctor?.user?.firstName ?? '';
    const last = appointment.doctor?.user?.lastName ?? '';
    return `Dr. ${first} ${last}`.trim();
  }
}
