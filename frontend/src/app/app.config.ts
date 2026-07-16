import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([loggingInterceptor, authInterceptor, errorInterceptor])
    ),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.initializeAuth());
    }),
  ],
};
