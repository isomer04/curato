import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const storageService = inject(StorageService);
    const authService = inject(AuthService);

    // Only attach credentials (HttpOnly cookie) to requests targeting our own API.
    // Sending withCredentials: true for every request (e.g. third-party analytics or CDN
    // assets) leaks cookies cross-site and violates the Same-Origin policy intent.
    const isApiRequest = req.url.startsWith(environment.apiUrl);
    if (isApiRequest) {
        req = req.clone({ withCredentials: true });
    }

    // Skip auth for refresh token and public endpoints
    const skipAuth = req.url.includes('/auth/login') ||
        req.url.includes('/auth/register') ||
        req.url.includes('/auth/refresh-token');

    if (skipAuth) {
        return next(req);
    }

    const token = storageService.getAccessToken();

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // If it's a 401 error and not from a skipAuth endpoint (login, register, refresh)
            // ALSO skip if it's from logout endpoint to prevent infinite loops
            const isLogoutRequest = req.url.includes('/auth/logout');

            if (error.status === 401 && !req.url.includes('/auth/refresh-token') && !isLogoutRequest) {
                // Try to refresh token
                return authService.refreshToken().pipe(
                    switchMap((response) => {
                        const newReq = req.clone({
                            setHeaders: {
                                Authorization: `Bearer ${response.data.accessToken}`,
                            },
                        });
                        return next(newReq);
                    }),
                    catchError((refreshError) => {
                        // If refresh fails, log out
                        authService.logout();
                        return throwError(() => refreshError);
                    })
                );
            }

            // If it's a 401 and we are on logout, or if it's any other error, just propagate it
            return throwError(() => error);
        })
    );
};
