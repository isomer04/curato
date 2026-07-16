import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InsuranceService } from '../../../core/services/insurance.service';
import { LoggerService } from '../../../core/services/logger.service';
import { AppointmentStatus, Appointment, InsuranceStatus } from '../../../core/models';
import { StatusBadgePipe } from '../../../shared/pipes/status-badge.pipe';

interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

@Component({
  selector: 'app-doctor-appointments',
  imports: [CommonModule, FormsModule, StatusBadgePipe],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorAppointmentsComponent implements OnInit {
  protected readonly appointmentService = inject(AppointmentService);
  private readonly notificationService = inject(NotificationService);
  private readonly insuranceService = inject(InsuranceService);
  private readonly logger = inject(LoggerService);

  protected readonly viewMode = signal<'list' | 'calendar'>('list');
  protected readonly showCompleteModal = signal(false);
  protected readonly showCancelModal = signal(false);

  protected readonly selectedStatus = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly selectedAppointment = signal<Appointment | null>(null);
  protected readonly completionNotes = signal('');
  protected readonly cancellationReason = signal('');
  protected readonly prescriptions = signal<PrescriptionItem[]>([]);

  ngOnInit(): void {
    this.loadAppointments();
  }

  protected loadAppointments(): void {
    this.appointmentService
      .getAppointments({
        status: (this.selectedStatus() as AppointmentStatus) || undefined,
        startDate: this.startDate() || undefined,
        endDate: this.endDate() || undefined,
        limit: 50,
      })
      .subscribe({
        error: () => {
          this.notificationService.error('Error', 'Failed to load appointments');
        },
      });
  }

  protected resetFilters(): void {
    this.selectedStatus.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.loadAppointments();
  }

  protected confirmAppointment(apt: Appointment): void {
    this.appointmentService.confirmAppointment(apt.id).subscribe({
      next: () => {
        this.notificationService.success('Success', 'Appointment confirmed');
        this.loadAppointments();
      },
      error: () => {
        this.notificationService.error('Error', 'Failed to confirm appointment');
      },
    });
  }

  protected openCompleteModal(apt: Appointment): void {
    this.selectedAppointment.set(apt);
    this.completionNotes.set('');
    this.prescriptions.set([]);
    this.showCompleteModal.set(true);
  }

  protected openCancelModal(apt: Appointment): void {
    this.selectedAppointment.set(apt);
    this.cancellationReason.set('');
    this.showCancelModal.set(true);
  }

  protected closeModals(): void {
    this.showCompleteModal.set(false);
    this.showCancelModal.set(false);
    this.selectedAppointment.set(null);
  }

  protected addPrescription(): void {
    this.prescriptions.update((list) => [
      ...list,
      { medication: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  }

  protected removePrescription(index: number): void {
    this.prescriptions.update((list) => list.filter((_, i) => i !== index));
  }

  protected completeAppointment(): void {
    const apt = this.selectedAppointment();
    if (!apt) return;

    const validPrescriptions = this.prescriptions().filter((p) => p.medication && p.dosage);

    this.appointmentService
      .completeAppointment(
        apt.id,
        this.completionNotes() || undefined,
        validPrescriptions.length > 0 ? validPrescriptions : undefined,
      )
      .subscribe({
        next: () => {
          this.notificationService.success('Success', 'Appointment completed');
          this.closeModals();
          this.loadAppointments();
        },
        error: () => {
          this.notificationService.error('Error', 'Failed to complete appointment');
        },
      });
  }

  protected cancelAppointment(): void {
    const apt = this.selectedAppointment();
    const reason = this.cancellationReason();
    if (!apt || reason.length < 10) return;

    this.appointmentService.cancelAppointment(apt.id, reason).subscribe({
      next: () => {
        this.notificationService.success('Success', 'Appointment cancelled');
        this.closeModals();
        this.loadAppointments();
      },
      error: () => {
        this.notificationService.error('Error', 'Failed to cancel appointment');
      },
    });
  }

  protected verifyPatientInsurance(apt: Appointment): void {
    if (!apt.patientId) return;

    this.insuranceService.getPatientInsurance(apt.patientId).subscribe({
      next: (val) => {
        const insurances = val.data?.insurances ?? [];
        const activeInsurance = insurances.find((ins) => ins.isActive);

        if (!activeInsurance) {
          this.notificationService.error('Verification Failed', 'Patient has no active insurance.');
          return;
        }

        if (activeInsurance.verificationStatus === InsuranceStatus.VERIFIED) {
          this.notificationService.success(
            'Already Verified',
            'Patient insurance is already verified.',
          );
          return;
        }

        this.insuranceService.verifyInsurance(activeInsurance.id).subscribe({
          next: () => {
            this.notificationService.success(
              'Verified',
              'Patient insurance has been successfully verified.',
            );
          },
          error: (err: unknown) => {
            this.notificationService.error('Error', 'Failed to verify insurance.');
            this.logger.error('[DoctorAppointments] verifyInsurance error:', err);
          },
        });
      },
      error: (err: unknown) => {
        this.notificationService.error('Error', 'Could not fetch patient insurance.');
        this.logger.error('[DoctorAppointments] getPatientInsurance error:', err);
      },
    });
  }
}
