import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { MedicalRecord } from '../models/medical-record.model';

@Injectable({
    providedIn: 'root',
})
export class MedicalRecordService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/medical-records`;

    getMyRecords(): Observable<{ success: boolean; data: MedicalRecord[]; message?: string }> {
        return this.http.get<{ success: boolean; data: MedicalRecord[]; message?: string }>(`${this.apiUrl}/my-records`);
    }

    downloadMyRecordsCsv(): void {
        this.http
            .get(`${this.apiUrl}/export/csv`, { responseType: 'blob' })
            .subscribe((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `medical_records_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            });
    }
    downloadMyRecordsPdf(): void {
        this.http
            .get(`${this.apiUrl}/export/pdf`, { responseType: 'blob' })
            .subscribe((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `medical_records_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            });
    }
}
