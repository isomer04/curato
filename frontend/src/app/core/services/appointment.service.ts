import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentData,
  AppointmentFilters,
  PaginatedResponse,
  AppointmentResponse,
  AppointmentStatsResponse,
  Prescription,
} from '../models';
import { AppointmentStatusCounts } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/appointments`;

  // Signals for state management
  private appointmentsSignal = signal<Appointment[]>([]);
  private selectedAppointmentSignal = signal<Appointment | null>(null);
  private isLoadingSignal = signal<boolean>(false);
  private totalSignal = signal<number>(0);
  private statsSignal = signal<AppointmentStatusCounts | null>(null);

  // Public readonly signals
  readonly appointments = computed(() => this.appointmentsSignal());
  readonly selectedAppointment = computed(() => this.selectedAppointmentSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly total = computed(() => this.totalSignal());
  /** Pre-aggregated status counts; populated by getDashboardStats(). */
  readonly dashboardStats = computed(() => this.statsSignal());

  // Computed signals for filtered lists
  readonly upcomingAppointments = computed(() =>
    this.appointmentsSignal().filter(
      (apt) =>
        apt.status === AppointmentStatus.SCHEDULED || apt.status === AppointmentStatus.CONFIRMED,
    ),
  );

  readonly pastAppointments = computed(() =>
    this.appointmentsSignal().filter(
      (apt) =>
        apt.status === AppointmentStatus.COMPLETED || apt.status === AppointmentStatus.NO_SHOW,
    ),
  );

  getAppointments(filters: AppointmentFilters = {}): Observable<PaginatedResponse<Appointment>> {
    this.isLoadingSignal.set(true);

    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<PaginatedResponse<Appointment>>(this.apiUrl, { params }).pipe(
      tap((response) => {
        this.appointmentsSignal.set(response.data);
        this.totalSignal.set(response.metadata.total);
      }),
      finalize(() => this.isLoadingSignal.set(false)),
    );
  }

  getAppointmentById(id: string): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => {
        this.selectedAppointmentSignal.set(response.data.appointment);
      }),
    );
  }

  getAvailableSlots(doctorId: string, date: string): Observable<{ data: { slots: string[] } }> {
    const params = new HttpParams().set('doctorId', doctorId).set('date', date);

    return this.http.get<{ data: { slots: string[] } }>(`${this.apiUrl}/available-slots`, {
      params,
    });
  }

  createAppointment(data: CreateAppointmentData): Observable<AppointmentResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AppointmentResponse>(this.apiUrl, data).pipe(
      tap((response) => {
        const currentAppointments = this.appointmentsSignal();
        this.appointmentsSignal.set([response.data.appointment, ...currentAppointments]);
      }),
      finalize(() => this.isLoadingSignal.set(false)),
    );
  }

  updateAppointment(id: string, data: Partial<Appointment>): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.apiUrl}/${id}`, data).pipe(
      tap((response) => {
        const currentAppointments = this.appointmentsSignal();
        const index = currentAppointments.findIndex((apt) => apt.id === id);
        if (index !== -1) {
          currentAppointments[index] = response.data.appointment;
          this.appointmentsSignal.set([...currentAppointments]);
        }
      }),
    );
  }

  cancelAppointment(id: string, cancellationReason: string): Observable<AppointmentResponse> {
    return this.http
      .post<AppointmentResponse>(`${this.apiUrl}/${id}/cancel`, { cancellationReason })
      .pipe(
        tap((response) => {
          const currentAppointments = this.appointmentsSignal();
          const index = currentAppointments.findIndex((apt) => apt.id === id);
          if (index !== -1) {
            currentAppointments[index] = response.data.appointment;
            this.appointmentsSignal.set([...currentAppointments]);
          }
        }),
      );
  }

  confirmAppointment(id: string): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.apiUrl}/${id}/confirm`, {});
  }

  completeAppointment(
    id: string,
    notes?: string,
    prescriptions?: Prescription[],
  ): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.apiUrl}/${id}/complete`, {
      notes,
      prescriptions,
    });
  }

  clearSelection(): void {
    this.selectedAppointmentSignal.set(null);
  }

  /**
   * Fetch pre-aggregated appointment status counts from the dashboard-stats endpoint.
   *
   * Returns a tiny payload (just counts) instead of full appointment records,
   * making it ideal for parallel loading on the patient dashboard.
   */
  getDashboardStats(): Observable<AppointmentStatsResponse> {
    return this.http
      .get<AppointmentStatsResponse>(`${this.apiUrl}/dashboard-stats`)
      .pipe(tap((response) => this.statsSignal.set(response.data.stats)));
  }
}
