/**
 * BookAppointmentComponent
 *
 * Multi-step appointment booking wizard allowing patients to:
 * 1. Search and select a doctor
 * 2. Choose an available date
 * 3. Select a time slot
 * 4. Provide reason for visit
 * 5. Confirm and book
 *
 * Uses reactive signals for state management and computed values
 * for derived state like filtered doctors.
 */
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoggerService } from '../../../../core/services/logger.service';
import { Doctor } from '../../../../core/models';
import {
  MAX_BOOKING_DAYS_AHEAD,
  MIN_REASON_LENGTH,
  MAX_REASON_LENGTH,
} from '../../../../core/constants';

/**
 * Medical specializations available for filtering.
 * Matches backend enum values.
 */
const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'General Medicine',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
] as const;

@Component({
  selector: 'app-book-appointment',
  imports: [RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookAppointmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly appointmentService = inject(AppointmentService);
  private readonly doctorService = inject(DoctorService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);

  /** All doctors from API */
  protected readonly doctors = signal<Doctor[]>([]);

  /** Search and filter inputs as signals so computed() can watch them */
  protected readonly searchTerm = signal('');
  protected readonly selectedSpecialization = signal('');

  /** Filtered doctors derived automatically from doctors, searchTerm, and selectedSpecialization */
  protected readonly filteredDoctors = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const spec = this.selectedSpecialization();
    return this.doctors().filter((d) => {
      const matchesTerm =
        !term ||
        d.firstName?.toLowerCase().includes(term) ||
        d.lastName?.toLowerCase().includes(term) ||
        d.specialization?.toLowerCase().includes(term);
      const matchesSpec = !spec || d.specialization === spec;
      return matchesTerm && matchesSpec;
    });
  });

  /** Available time slots for selected date */
  protected readonly availableSlots = signal<string[]>([]);

  /** Currently selected doctor */
  protected readonly selectedDoctor = signal<Doctor | null>(null);

  /** Currently selected time slot */
  protected readonly selectedSlot = signal<string | null>(null);

  /** Loading states */
  protected readonly isLoadingDoctors = signal(false);
  protected readonly isLoadingSlots = signal(false);
  protected readonly isSubmitting = signal(false);

  /** Error states */
  protected readonly doctorLoadError = signal(false);
  protected readonly slotLoadError = signal(false);

  /** Available specializations */
  protected readonly specializations = SPECIALIZATIONS;

  /** Min reason length for validation feedback */
  protected readonly minReasonLength = MIN_REASON_LENGTH;

  /**
   * Date boundaries for appointment booking.
   * Prevents booking in the past or too far in the future.
   */
  protected readonly minDate = new Date().toISOString().split('T')[0];
  protected readonly maxDate = new Date(Date.now() + MAX_BOOKING_DAYS_AHEAD * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  /** Booking form for date and reason */
  protected readonly bookingForm = this.fb.group({
    appointmentDate: ['', Validators.required],
    reasonForVisit: [
      '',
      [
        Validators.required,
        Validators.minLength(MIN_REASON_LENGTH),
        Validators.maxLength(MAX_REASON_LENGTH),
      ],
    ],
  });

  ngOnInit(): void {
    this.loadDoctors();
  }

  /**
   * Load all available doctors from the API.
   */
  protected loadDoctors(): void {
    this.isLoadingDoctors.set(true);
    this.doctorLoadError.set(false);

    this.doctorService.getDoctors().subscribe({
      next: (response) => {
        this.doctors.set(response.data || []);
        this.isLoadingDoctors.set(false);
      },
      error: (error: unknown) => {
        this.logger.error('Failed to load doctors:', error);
        this.doctorLoadError.set(true);
        this.isLoadingDoctors.set(false);
      },
    });
  }

  /**
   * Retry loading doctors after an error.
   */
  protected retryLoadDoctors(): void {
    this.loadDoctors();
  }

  /**
   * Handle doctor selection.
   */
  protected selectDoctor(doctor: Doctor): void {
    this.selectedDoctor.set(doctor);
    this.selectedSlot.set(null);
    this.availableSlots.set([]);

    // Load slots if date is already selected
    if (this.bookingForm.get('appointmentDate')?.value) {
      this.loadAvailableSlots();
    }
  }

  /**
   * Load available time slots for the selected doctor and date.
   */
  protected loadAvailableSlots(): void {
    const doctor = this.selectedDoctor();
    const date = this.bookingForm.get('appointmentDate')?.value;

    if (!doctor || !date) return;

    this.isLoadingSlots.set(true);
    this.slotLoadError.set(false);

    this.appointmentService.getAvailableSlots(doctor.id, date).subscribe({
      next: (response) => {
        this.availableSlots.set(response.data.slots || []);
        this.isLoadingSlots.set(false);
      },
      error: (error: unknown) => {
        this.logger.error('Failed to load available slots:', error);
        this.slotLoadError.set(true);
        this.isLoadingSlots.set(false);
      },
    });
  }

  /**
   * Handle time slot selection.
   */
  protected selectSlot(slot: string): void {
    this.selectedSlot.set(slot);
  }

  /**
   * Submit the appointment booking.
   */
  protected onSubmit(): void {
    if (this.bookingForm.invalid || !this.selectedDoctor() || !this.selectedSlot()) {
      return;
    }

    const doctor = this.selectedDoctor();
    const slot = this.selectedSlot();
    const appointmentDate = this.bookingForm.get('appointmentDate')?.value;
    const reasonForVisit = this.bookingForm.get('reasonForVisit')?.value;
    if (!doctor || !slot || !appointmentDate || !reasonForVisit) return;

    this.isSubmitting.set(true);

    this.appointmentService
      .createAppointment({
        doctorId: doctor.id,
        appointmentDate,
        startTime: slot,
        reasonForVisit,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('Success', 'Appointment booked successfully!');
          this.router.navigate(['/patient/appointments']);
        },
        error: (error: unknown) => {
          void error;
          this.isSubmitting.set(false);
        },
      });
  }

  /**
   * Get doctor initials for avatar display.
   */
  protected getDoctorInitials(doctor: Doctor): string {
    const first = doctor.firstName?.charAt(0) || '';
    const last = doctor.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  /**
   * Get doctor full name.
   */
  protected getDoctorName(doctor: Doctor): string {
    return `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
  }

  /**
   * Check if form has a specific error.
   */
  protected hasError(controlName: string, errorName: string): boolean {
    const control = this.bookingForm.get(controlName);
    return control ? control.hasError(errorName) && control.touched : false;
  }
}
