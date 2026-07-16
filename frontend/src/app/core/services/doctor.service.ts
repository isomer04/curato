import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DayOfWeek,
  AvailabilityResponse,
  DoctorsResponse,
  DoctorAvailability,
  Patient,
} from '../models';

export interface DoctorPatientsResponse {
  data: Patient[];
  metadata: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/doctors`;

  getAvailability(): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(`${this.apiUrl}/availability`);
  }

  updateSchedule(
    schedule: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration: number;
    }>,
    effectiveFrom: string,
  ): Observable<{
    success: boolean;
    data: { availabilities: DoctorAvailability[] };
    message?: string;
  }> {
    return this.http.post<{
      success: boolean;
      data: { availabilities: DoctorAvailability[] };
      message?: string;
    }>(`${this.apiUrl}/schedule`, {
      schedule,
      effectiveFrom,
    });
  }

  getDoctors(): Observable<DoctorsResponse> {
    return this.http.get<DoctorsResponse>(this.apiUrl);
  }

  getDoctorPatients(page = 1, limit = 25): Observable<DoctorPatientsResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<DoctorPatientsResponse>(`${this.apiUrl}/patients`, { params });
  }
}
