import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const requiredRoles = route.data['roles'] as UserRole[] | undefined;

    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    const userRole = authService.userRole();

    if (userRole && requiredRoles.includes(userRole)) {
        return true;
    }

    // Redirect to unauthorized or home
    router.navigate(['/unauthorized']);
    return false;
};

export const patientGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasRole(UserRole.PATIENT)) {
        return true;
    }

    router.navigate(['/unauthorized']);
    return false;
};

export const doctorGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasRole(UserRole.DOCTOR)) {
        return true;
    }

    router.navigate(['/unauthorized']);
    return false;
};

export const adminGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasRole(UserRole.ADMIN)) {
        return true;
    }

    router.navigate(['/unauthorized']);
    return false;
};
