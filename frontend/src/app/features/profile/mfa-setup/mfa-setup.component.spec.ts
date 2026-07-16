import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MfaSetupComponent } from './mfa-setup.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UserRole } from '../../../core/models';

describe('MfaSetupComponent', () => {
    let component: MfaSetupComponent;
    let fixture: ComponentFixture<MfaSetupComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let router: Router;

    beforeEach(async () => {
        mockAuthService = jasmine.createSpyObj('AuthService', ['setupMfa', 'verifySetupMfa'], {
            userRole: signal<UserRole | null>(UserRole.PATIENT),
        });
        mockAuthService.setupMfa.and.returnValue(of({
            success: true,
            data: { qrCodeUrl: 'data:image/png;base64,abc', secret: 'ABCD1234' },
            message: 'OK',
        }));
        mockAuthService.verifySetupMfa.and.returnValue(of({
            success: true,
            data: {},
            message: 'Verified',
        }));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info']);

        await TestBed.configureTestingModule({
            imports: [MfaSetupComponent],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: NotificationService, useValue: mockNotificationService },
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(MfaSetupComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('initializeSetup', () => {
        it('MfaSetupComponent — initializeSetup — success — sets qrCodeUrl and secret', fakeAsync(() => {
            component['initializeSetup']();
            tick();
            expect(component['qrCodeUrl']()).toBe('data:image/png;base64,abc');
            expect(component['secret']()).toBe('ABCD1234');
            expect(component['isLoading']()).toBe(false);
        }));

        it('MfaSetupComponent — initializeSetup — response with no data — does not set values', fakeAsync(() => {
            mockAuthService.setupMfa.and.returnValue(of({ success: false, data: { qrCodeUrl: '', secret: '' }, message: 'Error' }));
            component['initializeSetup']();
            tick();
            expect(component['qrCodeUrl']()).toBe('');
            expect(component['isLoading']()).toBe(false);
        }));

        it('MfaSetupComponent — initializeSetup — error — shows error notification', fakeAsync(() => {
            mockAuthService.setupMfa.and.returnValue(throwError(() => new Error('Server')));
            component['initializeSetup']();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to initialize MFA setup.');
            expect(component['isLoading']()).toBe(false);
        }));
    });

    describe('verifySetup', () => {
        it('MfaSetupComponent — verifySetup — invalid form — returns early', () => {
            component['mfaForm'].reset();
            component['verifySetup']();
            expect(mockAuthService.verifySetupMfa).not.toHaveBeenCalled();
        });

        it('MfaSetupComponent — verifySetup — success — shows success and navigates', fakeAsync(() => {
            component['mfaForm'].patchValue({ code: '123456' });
            component['verifySetup']();
            tick();
            expect(mockNotificationService.success).toHaveBeenCalledWith('Success', 'MFA has been successfully enabled.');
            expect(router.navigate).toHaveBeenCalled();
            expect(component['isVerifying']()).toBe(false);
        }));

        it('MfaSetupComponent — verifySetup — error — shows error notification', fakeAsync(() => {
            component['mfaForm'].patchValue({ code: '123456' });
            mockAuthService.verifySetupMfa.and.returnValue(throwError(() => new Error('Bad code')));
            component['verifySetup']();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Invalid or expired code. Please try again.');
            expect(component['isVerifying']()).toBe(false);
        }));
    });

    describe('goBack', () => {
        it('MfaSetupComponent — goBack — with role — navigates to role dashboard', () => {
            (mockAuthService as unknown as { userRole: ReturnType<typeof signal> }).userRole.set(UserRole.DOCTOR);
            component['goBack']();
            expect(router.navigate).toHaveBeenCalledWith(['/doctor/dashboard']);
        });

        it('MfaSetupComponent — goBack — no role — navigates to root', () => {
            (mockAuthService as unknown as { userRole: ReturnType<typeof signal> }).userRole.set(null);
            component['goBack']();
            expect(router.navigate).toHaveBeenCalledWith(['/']);
        });
    });
});
