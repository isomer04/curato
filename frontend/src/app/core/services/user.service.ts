import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserFilters, UserResponse, UserRole } from '../models';

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  getUsers(params: UserFilters): Observable<UserResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('limit', params.limit.toString());

    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<UserResponse>(this.apiUrl, { params: httpParams });
  }

  createUser(data: CreateUserPayload): Observable<{ success: boolean; data: unknown }> {
    return this.http.post<{ success: boolean; data: unknown }>(this.apiUrl, data);
  }

  updateUser(id: string, data: UpdateUserPayload): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  toggleUserStatus(id: string, isActive: boolean): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/${id}`, { isActive });
  }
}
