import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { InsuranceService } from '../../../core/services/insurance.service';
import { Insurance, InsuranceStatus, CreateInsuranceData } from '../../../core/models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-insurance',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './insurance.component.html',
  styleUrl: './insurance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsuranceComponent implements OnInit {
  private insuranceService = inject(InsuranceService);
  private fb = inject(FormBuilder);

  insurances = signal<Insurance[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showForm = signal<boolean>(false);
  editingId = signal<string | null>(null);

  InsuranceStatus = InsuranceStatus;

  insuranceForm = this.fb.group({
    providerName: ['', [Validators.required, Validators.minLength(2)]],
    policyNumber: ['', [Validators.required]],
    groupNumber: [''],
    subscriberName: ['', [Validators.required]],
    subscriberRelation: ['self', [Validators.required]],
    planType: [''],
    coverageStartDate: ['', [Validators.required]],
    coverageEndDate: [''],
    copayAmount: [0],
    deductibleAmount: [0],
  });

  ngOnInit(): void {
    this.fetchInsurances();
  }

  fetchInsurances(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.insuranceService
      .getInsurances()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.insurances.set(response.data.insurances);
          }
        },
        error: () => {
          this.error.set('Failed to load insurance records');
        },
      });
  }

  openForm(insurance?: Insurance): void {
    this.showForm.set(true);
    this.success.set(null);
    this.error.set(null);

    if (insurance) {
      this.editingId.set(insurance.id);
      this.insuranceForm.patchValue({
        providerName: insurance.providerName,
        policyNumber: insurance.policyNumber,
        groupNumber: insurance.groupNumber ?? '',
        subscriberName: insurance.subscriberName,
        subscriberRelation: insurance.subscriberRelation,
        planType: insurance.planType ?? '',
        coverageStartDate: insurance.coverageStartDate,
        coverageEndDate: insurance.coverageEndDate ?? '',
        copayAmount: insurance.copayAmount ?? 0,
        deductibleAmount: insurance.deductibleAmount ?? 0,
      });
    } else {
      this.editingId.set(null);
      this.insuranceForm.reset({ subscriberRelation: 'self', copayAmount: 0, deductibleAmount: 0 });
    }
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.insuranceForm.reset();
  }

  onSubmit(): void {
    if (this.insuranceForm.invalid) return;

    const raw = this.insuranceForm.getRawValue();
    const payload: CreateInsuranceData = {
      providerName: raw.providerName ?? '',
      policyNumber: raw.policyNumber ?? '',
      groupNumber: raw.groupNumber || undefined,
      subscriberName: raw.subscriberName ?? '',
      subscriberRelation: raw.subscriberRelation ?? 'self',
      planType: raw.planType || undefined,
      coverageStartDate: raw.coverageStartDate ?? '',
      coverageEndDate: raw.coverageEndDate || undefined,
      copayAmount: raw.copayAmount ?? 0,
      deductibleAmount: raw.deductibleAmount ?? 0,
    };

    this.isLoading.set(true);

    const editingId = this.editingId();
    if (editingId) {
      this.insuranceService
        .updateInsurance(editingId, payload)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.success.set('Insurance record updated successfully');
            this.closeForm();
            this.fetchInsurances();
          },
          error: () => {
            this.error.set('Failed to update insurance record');
          },
        });
    } else {
      this.insuranceService
        .createInsurance(payload)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.success.set('Insurance record created successfully');
            this.closeForm();
            this.fetchInsurances();
          },
          error: (error: unknown) => {
            void error;
            this.error.set('Failed to create insurance record');
          },
        });
    }
  }

  deactivateInsurance(id: string): void {
    if (!confirm('Are you sure you want to deactivate this insurance?')) return;
    this.insuranceService.deactivateInsurance(id).subscribe({
      next: () => {
        this.success.set('Insurance deactivated');
        this.fetchInsurances();
      },
      error: (error: unknown) => {
        void error;
        this.error.set('Failed to deactivate insurance');
      },
    });
  }

  deleteInsurance(id: string): void {
    if (!confirm('Are you sure you want to delete this insurance record? This cannot be undone.'))
      return;
    this.insuranceService.deleteInsurance(id).subscribe({
      next: () => {
        this.success.set('Insurance record deleted');
        this.fetchInsurances();
      },
      error: (error: unknown) => {
        void error;
        this.error.set('Failed to delete insurance record');
      },
    });
  }

  getStatusClass(status: InsuranceStatus): string {
    switch (status) {
      case InsuranceStatus.VERIFIED:
        return 'bg-success';
      case InsuranceStatus.PENDING:
        return 'bg-warning text-dark';
      case InsuranceStatus.REJECTED:
        return 'bg-danger';
      case InsuranceStatus.EXPIRED:
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getStatusIcon(status: InsuranceStatus): string {
    switch (status) {
      case InsuranceStatus.VERIFIED:
        return 'bi-check-circle-fill';
      case InsuranceStatus.PENDING:
        return 'bi-hourglass-split';
      case InsuranceStatus.REJECTED:
        return 'bi-x-circle-fill';
      case InsuranceStatus.EXPIRED:
        return 'bi-clock-history';
      default:
        return 'bi-question-circle';
    }
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.insuranceForm.get(controlName);
    return !!control && control.hasError(errorName) && control.touched;
  }
}
