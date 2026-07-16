import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Insurance,
    CreateInsuranceData,
    InsuranceResponse,
    InsuranceListResponse,
    ActiveInsuranceResponse,
} from '../models';

@Injectable({
    providedIn: 'root',
})
export class InsuranceService {
    private http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/insurance`;

    // Signals for state management
    private insurancesSignal = signal<Insurance[]>([]);
    private activeInsuranceSignal = signal<Insurance | null>(null);
    private isLoadingSignal = signal<boolean>(false);

    // Public readonly signals
    readonly insurances = computed(() => this.insurancesSignal());
    readonly activeInsurance = computed(() => this.activeInsuranceSignal());
    readonly isLoading = computed(() => this.isLoadingSignal());
    readonly hasActiveInsurance = computed(() => !!this.activeInsuranceSignal());

    getInsurances(): Observable<InsuranceListResponse> {
        this.isLoadingSignal.set(true);
        return this.http.get<InsuranceListResponse>(this.apiUrl).pipe(
            tap((response) => {
                this.insurancesSignal.set(response.data.insurances);
                this.isLoadingSignal.set(false);
            })
        );
    }

    getInsuranceById(id: string): Observable<InsuranceResponse> {
        return this.http.get<InsuranceResponse>(`${this.apiUrl}/${id}`);
    }

    getActiveInsurance(): Observable<ActiveInsuranceResponse> {
        return this.http.get<ActiveInsuranceResponse>(`${this.apiUrl}/active`).pipe(
            tap((response) => {
                this.activeInsuranceSignal.set(response.data.insurance);
            })
        );
    }

    createInsurance(data: CreateInsuranceData): Observable<InsuranceResponse> {
        this.isLoadingSignal.set(true);
        return this.http.post<InsuranceResponse>(this.apiUrl, data).pipe(
            tap((response) => {
                const current = this.insurancesSignal();
                this.insurancesSignal.set([response.data.insurance, ...current]);
                this.isLoadingSignal.set(false);
            })
        );
    }

    updateInsurance(id: string, data: Partial<CreateInsuranceData>): Observable<InsuranceResponse> {
        return this.http.put<InsuranceResponse>(`${this.apiUrl}/${id}`, data).pipe(
            tap((response) => {
                const current = this.insurancesSignal();
                const index = current.findIndex((i) => i.id === id);
                if (index !== -1) {
                    current[index] = response.data.insurance;
                    this.insurancesSignal.set([...current]);
                }
            })
        );
    }

    deactivateInsurance(id: string): Observable<InsuranceResponse> {
        return this.http.post<InsuranceResponse>(`${this.apiUrl}/${id}/deactivate`, {}).pipe(
            tap((response) => {
                const current = this.insurancesSignal();
                const index = current.findIndex((i) => i.id === id);
                if (index !== -1) {
                    current[index] = response.data.insurance;
                    this.insurancesSignal.set([...current]);
                }
                if (this.activeInsuranceSignal()?.id === id) {
                    this.activeInsuranceSignal.set(null);
                }
            })
        );
    }

    deleteInsurance(id: string): Observable<{ success: boolean; message: string }> {
        return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`).pipe(
            tap(() => {
                const current = this.insurancesSignal().filter((i) => i.id !== id);
                this.insurancesSignal.set(current);
                if (this.activeInsuranceSignal()?.id === id) {
                    this.activeInsuranceSignal.set(null);
                }
            })
        );
    }

    getPatientInsurance(patientId: string): Observable<InsuranceListResponse> {
        return this.http.get<InsuranceListResponse>(`${this.apiUrl}/patient/${patientId}`);
    }

    verifyInsurance(id: string): Observable<InsuranceResponse> {
        return this.http.post<InsuranceResponse>(`${this.apiUrl}/${id}/verify`, { status: 'verified' }).pipe(
            tap((response) => {
                const current = this.insurancesSignal();
                const index = current.findIndex((i) => i.id === id);
                if (index !== -1) {
                    current[index] = response.data.insurance;
                    this.insurancesSignal.set([...current]);
                }
            })
        );
    }
}
