import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { MedicalRecord, MedicalRecordType } from '../../../core/models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-medical-records',
  imports: [TitleCasePipe, DatePipe],
  templateUrl: './medical-records.component.html',
  styleUrl: './medical-records.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedicalRecordsComponent implements OnInit {
  private medicalRecordService = inject(MedicalRecordService);

  records = signal<MedicalRecord[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchRecords();
  }

  fetchRecords(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.medicalRecordService
      .getMyRecords()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.records.set(response.data);
          } else {
            this.error.set('Failed to load medical records');
          }
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load medical records');
        },
      });
  }

  downloadCsv(): void {
    this.medicalRecordService.downloadMyRecordsCsv();
  }

  downloadPdf(): void {
    this.medicalRecordService.downloadMyRecordsPdf();
  }

  getRecordTypeIcon(type: MedicalRecordType): string {
    switch (type) {
      case MedicalRecordType.CONSULTATION:
        return 'bi-chat-left-text text-primary';
      case MedicalRecordType.LAB_RESULT:
        return 'bi-droplet text-danger';
      case MedicalRecordType.PRESCRIPTION:
        return 'bi-capsule text-success';
      case MedicalRecordType.SURGERY:
        return 'bi-bandaid text-warning';
      case MedicalRecordType.VACCINATION:
        return 'bi-shield-check text-info';
      default:
        return 'bi-file-medical text-secondary';
    }
  }

  getRecordTypeBadge(type: MedicalRecordType): string {
    switch (type) {
      case MedicalRecordType.CONSULTATION:
        return 'bg-primary-subtle text-primary';
      case MedicalRecordType.LAB_RESULT:
        return 'bg-danger-subtle text-danger';
      case MedicalRecordType.PRESCRIPTION:
        return 'bg-success-subtle text-success';
      case MedicalRecordType.SURGERY:
        return 'bg-warning-subtle text-warning';
      case MedicalRecordType.VACCINATION:
        return 'bg-info-subtle text-info';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }
}
