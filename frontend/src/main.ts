/**
 * Application Bootstrap
 * 
 * This is the entry point of the Angular application.
 * It bootstraps the root AppComponent with the provided configuration.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
