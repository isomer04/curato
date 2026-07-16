import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AdminService, PendingDoctor } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-doctors',
  imports: [],
  templateUrl: './doctors.component.html',
  styleUrl: './doctors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDoctorsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  pendingDoctors = signal<PendingDoctor[]>([]);
  total = signal(0);
  isLoading = signal(true);
  errorMessage = signal('');
  actionInProgress = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPendingDoctors();
  }

  loadPendingDoctors(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.adminService.getPendingDoctors().subscribe({
      next: (res) => {
        this.pendingDoctors.set(res.data);
        this.total.set(res.metadata?.total ?? res.data.length);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load pending doctors.');
        this.isLoading.set(false);
      },
    });
  }

  approve(doctorId: string): void {
    this.actionInProgress.set(doctorId);
    this.adminService.approveDoctor(doctorId).subscribe({
      next: () => {
        this.actionInProgress.set(null);
        this.loadPendingDoctors();
      },
      error: () => {
        this.errorMessage.set('Failed to approve doctor.');
        this.actionInProgress.set(null);
      },
    });
  }

  reject(doctorId: string): void {
    this.actionInProgress.set(doctorId);
    this.adminService.rejectDoctor(doctorId).subscribe({
      next: () => {
        this.actionInProgress.set(null);
        this.loadPendingDoctors();
      },
      error: () => {
        this.errorMessage.set('Failed to reject doctor.');
        this.actionInProgress.set(null);
      },
    });
  }
}
