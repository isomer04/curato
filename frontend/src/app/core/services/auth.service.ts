import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, finalize, shareReplay, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  UserRole,
  LoginCredentials,
  RegisterData,
  PatientRegisterData,
  DoctorRegisterData,
  AuthResponse,
} from '../models';
import { StorageService } from './storage.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private readonly logger = inject(LoggerService);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Deduplicates concurrent refresh-token calls (e.g. page reload races)
  private refreshInProgress$: Observable<{ data: { accessToken: string } }> | null = null;

  // Signals for reactive state
  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);
  private isLoadingSignal = signal<boolean>(false);

  // Public readonly signals
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.isAuthenticatedSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly userRole = computed(() => this.currentUserSignal()?.role || null);

  constructor() {
    // Auth is initialized via APP_INITIALIZER in app.config.ts, which blocks
    // routing until initializeAuth() completes. This prevents components from
    // loading before the access token is in memory after a page refresh.
  }

  /**
   * Resolves auth state on application startup.
   * Called exclusively by APP_INITIALIZER — do not call elsewhere.
   * Never errors: on refresh failure the user is marked unauthenticated
   * and the route guard redirects to /auth/login.
   */
  initializeAuth(): Observable<void> {
    const token = this.storageService.getAccessToken();
    const user = this.storageService.getUser();

    if (token && user) {
      // Access token still in memory (e.g. SPA navigation, not a full reload)
      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);
      return of(undefined);
    }

    if (user) {
      // Page was refreshed — access token lost from memory but the HttpOnly
      // refresh-token cookie is still valid. APP_INITIALIZER blocks routing
      // here until the HTTP call resolves, so no component fires an API call
      // without a Bearer token.
      this.currentUserSignal.set(user);
      this.isLoadingSignal.set(true);

      return this.refreshToken().pipe(
        tap(() => {
          this.isLoadingSignal.set(false);
          this.isAuthenticatedSignal.set(true);
        }),
        catchError(() => {
          // Refresh failed — session expired or cookie missing.
          // Clear state without navigating; the route guard will redirect.
          this.isLoadingSignal.set(false);
          this.currentUserSignal.set(null);
          this.isAuthenticatedSignal.set(false);
          this.storageService.clearAuth();
          return of(undefined);
        }),
        map(() => undefined),
      );
    }

    // Not authenticated — nothing to resolve
    return of(undefined);
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  register(data: RegisterData): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  registerPatient(data: PatientRegisterData): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register/patient`, data).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  registerDoctor(data: DoctorRegisterData): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register/doctor`, data).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  verifyMfaLogin(tempToken: string, token: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/verify-mfa`, { tempToken, token }).pipe(
      tap((response) => {
        if (response.success && !response.data.mfaRequired) {
          const { user, accessToken } = response.data;
          this.handleAuthSuccess(user, accessToken);
        }
      }),
      catchError((error: unknown) => {
        this.isLoadingSignal.set(false);
        return throwError(() => error);
      }),
    );
  }

  setupMfa(): Observable<{
    success: boolean;
    data: { qrCodeUrl: string; secret: string };
    message?: string;
  }> {
    return this.http.post<{
      success: boolean;
      data: { qrCodeUrl: string; secret: string };
      message?: string;
    }>(`${this.apiUrl}/setup-mfa`, {});
  }

  verifySetupMfa(token: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/verify-setup-mfa`,
      { token },
    );
  }

  verifyEmail(token: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.apiUrl}/verify-email`, {
      token,
    });
  }

  resendVerificationEmail(email: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/resend-verification`,
      { email },
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      complete: () => this.clearAuth(),
      error: (err: unknown) => {
        this.logger.error('[AuthService] logout error (clearing session anyway):', err);
        this.clearAuth();
      },
    });
  }

  refreshToken(): Observable<{ data: { accessToken: string } }> {
    // Return the in-flight observable if a refresh is already in progress.
    // This prevents duplicate refresh calls (e.g. from initializeAuth() and
    // the 401 interceptor firing concurrently on page reload), which would
    // invalidate the backend's single-use rotation token and force a logout.
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    this.refreshInProgress$ = this.http
      .post<{
        data: { accessToken: string };
      }>(`${this.apiUrl}/refresh-token`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          this.storageService.setTokens(response.data.accessToken);
        }),
        catchError((err: unknown) => {
          this.clearAuth();
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshInProgress$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInProgress$;
  }

  getProfile(): Observable<{ data: User }> {
    return this.http.get<{ data: User }>(`${this.apiUrl}/profile`).pipe(
      tap((response) => {
        this.currentUserSignal.set(response.data);
        this.storageService.setUser(response.data);
      }),
    );
  }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
  }): Observable<{ data: User; message?: string }> {
    return this.http.patch<{ data: User; message?: string }>(`${this.apiUrl}/profile`, data).pipe(
      tap((response) => {
        this.currentUserSignal.set(response.data);
        this.storageService.setUser(response.data);
      }),
    );
  }

  requestEmailChange(newEmail: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/request-email-change`,
      { newEmail },
    );
  }

  confirmEmailChange(token: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/confirm-email-change`,
      { token },
    );
  }

  forgotPassword(email: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.apiUrl}/forgot-password`,
      {
        email,
      },
    );
  }

  resetPassword(
    token: string,
    newPassword: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.apiUrl}/reset-password`, {
      token,
      newPassword,
    });
  }

  private handleAuthSuccess(user: User, accessToken: string): void {
    this.storageService.setTokens(accessToken);
    this.storageService.setUser(user);
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
    this.isLoadingSignal.set(false);
  }

  private clearAuth(): void {
    this.storageService.clearAuth();
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/auth/login']);
  }

  hasRole(role: UserRole | UserRole[]): boolean {
    const userRole = this.currentUserSignal()?.role;
    if (!userRole) return false;

    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }
}
