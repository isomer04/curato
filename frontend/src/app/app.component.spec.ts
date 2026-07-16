/**
 * AppComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { NotificationService } from './core/services/notification.service';
import { signal } from '@angular/core';

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    beforeEach(async () => {
        mockNotificationService = jasmine.createSpyObj('NotificationService', ['dismiss'], {
            toasts: signal([]),
        });

        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideRouter([]),
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render navbar', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('app-navbar')).toBeTruthy();
    });

    it('should render footer', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('app-footer')).toBeTruthy();
    });

    it('should render router outlet', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('router-outlet')).toBeTruthy();
    });

    describe('getToastClass', () => {
        it('should return correct class for success', () => {
            expect(component['getToastClass']('success')).toBe('toast-success');
        });

        it('should return correct class for error', () => {
            expect(component['getToastClass']('error')).toBe('toast-error');
        });

        it('should return info class for unknown type', () => {
            expect(component['getToastClass']('unknown')).toBe('toast-info');
        });
    });

    describe('getToastIcon', () => {
        it('should return correct icon for success', () => {
            expect(component['getToastIcon']('success')).toContain('check');
        });

        it('should return correct icon for error', () => {
            expect(component['getToastIcon']('error')).toContain('exclamation');
        });
    });
});
