import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminStatsApiResponse } from '../models';

export interface AdminAppointmentUser {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AdminAppointment {
  id: string;
  status: string;
  appointmentDate: string;
  reasonForVisit?: string;
  patient?: { user?: AdminAppointmentUser };
  doctor?: { user?: AdminAppointmentUser };
}

export interface PendingDoctor {
  id: string;
  specialization: string;
  licenseNumber: string;
  isApproved: boolean;
  user?: { firstName: string; lastName: string; email: string };
}

export interface AdminPaginatedResponse<T> {
  data: T[];
  metadata: { total: number };
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;
  private appointmentsUrl = `${environment.apiUrl}/appointments`;

  getDashboardStats(): Observable<AdminStatsApiResponse> {
    return this.http.get<AdminStatsApiResponse>(`${this.apiUrl}/stats`);
  }

  getPendingDoctors(): Observable<AdminPaginatedResponse<PendingDoctor>> {
    return this.http.get<AdminPaginatedResponse<PendingDoctor>>(`${this.apiUrl}/doctors/pending`);
  }

  approveDoctor(doctorId: string): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/doctors/${doctorId}/approve`, {});
  }

  rejectDoctor(doctorId: string): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/doctors/${doctorId}/reject`, {});
  }

  getAppointments(params: {
    page: number;
    limit: number;
    status?: string;
  }): Observable<AdminPaginatedResponse<AdminAppointment>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page))
      .set('limit', String(params.limit));
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    return this.http.get<AdminPaginatedResponse<AdminAppointment>>(this.appointmentsUrl, {
      params: httpParams,
    });
  }
}
