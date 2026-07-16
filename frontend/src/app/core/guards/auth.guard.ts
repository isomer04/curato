import { inject } from '@angular/core';
import {
  Router,
  CanActivateFn,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Use the destination URL from RouterStateSnapshot, not the current active route.
  // router.url at this point reflects the previously active route, not the blocked destination.
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Redirect to appropriate dashboard based on role
  const role = authService.userRole();
  switch (role) {
    case UserRole.PATIENT:
      router.navigate(['/patient/dashboard']);
      break;
    case UserRole.DOCTOR:
      router.navigate(['/doctor/dashboard']);
      break;
    case UserRole.ADMIN:
      router.navigate(['/admin/dashboard']);
      break;
    default:
      // Authenticated user with an unknown role — fall back to login to re-authenticate.
      router.navigate(['/auth/login']);
      break;
  }
  return false;
};
