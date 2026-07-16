import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DoctorService } from '../../../core/services/doctor.service';
import { Patient } from '../../../core/models';

@Component({
  selector: 'app-doctor-patients',
  imports: [],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorPatientsComponent implements OnInit {
  private readonly doctorService = inject(DoctorService);

  public readonly searchQuery = signal('');
  public readonly isLoading = signal(true);
  private readonly allPatients = signal<Patient[]>([]);

  /** Patients filtered by the search query. */
  public readonly filteredPatients = computed<Patient[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.allPatients();
    return this.allPatients().filter((p) => {
      const name = `${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`.toLowerCase();
      const email = (p.user?.email ?? '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadPatients();
  }

  private loadPatients(): void {
    this.isLoading.set(true);
    this.doctorService.getDoctorPatients().subscribe({
      next: (response) => {
        this.allPatients.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  protected initials(patient: Patient): string {
    const first = patient.user?.firstName?.charAt(0) ?? '';
    const last = patient.user?.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase();
  }
}
