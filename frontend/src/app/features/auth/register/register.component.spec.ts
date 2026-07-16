/**
 * RegisterComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { of, throwError } from 'rxjs';
import { UserRole, Gender, User } from '../../../core/models';

describe('RegisterComponent', () => {
    let component: RegisterComponent;
    let fixture: ComponentFixture<RegisterComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;
    let router: Router;

    beforeEach(async () => {
        mockAuthService = jasmine.createSpyObj('AuthService', ['register', 'registerPatient', 'registerDoctor']);
        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info']);

        await TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RegisterComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should start at step 1', () => {
        expect(component['currentStep']()).toBe(1);
    });

    describe('step navigation', () => {
        beforeEach(() => {
            // Fill in valid data for step 1
            component['accountForm'].patchValue({
                role: UserRole.PATIENT,
                email: 'test@example.com',
                password: 'Test1234!',
                confirmPassword: 'Test1234!',
            });
        });

        it('should move to next step when form is valid', () => {
            component['nextStep']();
            expect(component['currentStep']()).toBe(2);
        });

        it('should allow going back to previous step', () => {
            component['nextStep']();
            expect(component['currentStep']()).toBe(2);

            component['previousStep']();
            expect(component['currentStep']()).toBe(1);
        });

        it('should not move to next step if form is invalid', () => {
            component['accountForm'].patchValue({ email: 'invalid' });
            component['nextStep']();
            expect(component['currentStep']()).toBe(1);
        });
    });

    describe('password validation', () => {
        it('should calculate password strength correctly', () => {
            component['accountForm'].get('password')?.setValue('weak');
            expect(component['getPasswordStrength']()).toBeLessThan(50);

            component['accountForm'].get('password')?.setValue('StrongPass1!');
            expect(component['getPasswordStrength']()).toBe(100);
        });

        it('should validate matching passwords', () => {
            component['accountForm'].patchValue({
                password: 'Password123!',
                confirmPassword: 'MismatchPassword123!'
            });
            expect(component['accountForm'].hasError('passwordMismatch')).toBeTrue();

            component['accountForm'].patchValue({
                confirmPassword: 'Password123!'
            });
            expect(component['accountForm'].hasError('passwordMismatch')).toBeFalse();
        });
    });

    describe('form submission', () => {
        const fillValidForm = (role: UserRole) => {
            // Step 1
            component['accountForm'].patchValue({
                role: role,
                email: 'test@example.com',
                password: 'Test1234!',
                confirmPassword: 'Test1234!',
            });
            // Step 2
            component['personalForm'].patchValue({
                firstName: 'John',
                lastName: 'Doe',
                phone: '1234567890',
                dateOfBirth: '1990-01-01',
                gender: Gender.MALE,
                address: '123 St',
            });
            // Step 3
            component['roleSpecificForm'].patchValue({
                acceptTerms: true,
                bloodType: 'A+', // Patient field
                specialization: 'Cardiology', // Doctor field
                licenseNumber: 'DOC123' // Doctor field
            });

            component['currentStep'].set(3);
        };

        const mockSuccessResponse = {
            success: true,
            data: {
                user: { id: '1', role: UserRole.PATIENT } as unknown as User,
                accessToken: 'tok'
            },
            message: 'Success'
        };

        it('should call registerPatient for patient role', () => {
            mockAuthService.registerPatient.and.returnValue(of(mockSuccessResponse));
            fillValidForm(UserRole.PATIENT);

            component['onSubmit']();

            expect(mockAuthService.registerPatient).toHaveBeenCalled();
            expect(mockNotificationService.success).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/']);
        });

        it('should call registerDoctor for doctor role', () => {
            mockAuthService.registerDoctor.and.returnValue(of(mockSuccessResponse));
            fillValidForm(UserRole.DOCTOR);

            component['onSubmit']();

            expect(mockAuthService.registerDoctor).toHaveBeenCalled();
            expect(mockNotificationService.success).toHaveBeenCalled();
        });

        it('should handle registration error', () => {
            mockAuthService.registerPatient.and.returnValue(throwError(() => ({ error: { message: 'Email taken' } })));
            fillValidForm(UserRole.PATIENT);

            component['onSubmit']();

            expect(component['isLoading']()).toBeFalse();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Registration Failed', 'Email taken');
        });

        it('RegisterComponent — patient with allergies and invalid blood type — correctly branches', () => {
            mockAuthService.registerPatient.and.returnValue(of(mockSuccessResponse));
            fillValidForm(UserRole.PATIENT);
            component['roleSpecificForm'].patchValue({
                allergies: 'penicillin, aspirin',
                bloodType: 'INVALID_TYPE',
            });
            component['onSubmit']();
            expect(mockAuthService.registerPatient).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    allergies: ['penicillin', 'aspirin'],
                    bloodGroup: undefined,
                }),
            );
        });

        it('RegisterComponent — patient with empty dateOfBirth — sets empty string for dateOfBirth', () => {
            mockAuthService.registerPatient.and.returnValue(of(mockSuccessResponse));
            fillValidForm(UserRole.PATIENT);
            // Override the personal form dateOfBirth to empty (skip validation by patching directly)
            component['personalForm'].patchValue({ dateOfBirth: '' });
            component['onSubmit']();
            expect(mockAuthService.registerPatient).toHaveBeenCalledWith(
                jasmine.objectContaining({ dateOfBirth: '' }),
            );
        });
    });

    describe('goToStep', () => {
        it('RegisterComponent — goToStep before current — navigates back', () => {
            component['currentStep'].set(3);
            component['goToStep'](2);
            expect(component['currentStep']()).toBe(2);
        });

        it('RegisterComponent — goToStep same or forward — does not change step', () => {
            component['currentStep'].set(2);
            component['goToStep'](3);
            expect(component['currentStep']()).toBe(2);
        });

        it('RegisterComponent — goToStep same step — does not change step', () => {
            component['currentStep'].set(2);
            component['goToStep'](2);
            expect(component['currentStep']()).toBe(2);
        });
    });

    describe('getPasswordStrengthClass', () => {
        it('RegisterComponent — strength 25 — returns bg-danger', () => {
            component['accountForm'].get('password')?.setValue('A');
            expect(component['getPasswordStrengthClass']()).toBe('bg-danger');
        });

        it('RegisterComponent — strength 50 — returns bg-warning', () => {
            // length (>=8) + uppercase = 50
            component['accountForm'].get('password')?.setValue('Abcdefgh');
            expect(component['getPasswordStrengthClass']()).toBe('bg-warning');
        });

        it('RegisterComponent — strength 75 — returns bg-info', () => {
            // length (>=8) + uppercase + number = 75
            component['accountForm'].get('password')?.setValue('Abcdefg1');
            expect(component['getPasswordStrengthClass']()).toBe('bg-info');
        });

        it('RegisterComponent — strength 100 — returns bg-success', () => {
            // length (>=8) + uppercase + number + special = 100
            component['accountForm'].get('password')?.setValue('Abcdefg1!');
            expect(component['getPasswordStrengthClass']()).toBe('bg-success');
        });
    });

    describe('hasError', () => {
        it('RegisterComponent — account form touched with error — returns true', () => {
            const ctrl = component['accountForm'].get('email');
            ctrl?.setValue('');
            ctrl?.markAsTouched();
            expect(component['hasError']('account', 'email', 'required')).toBeTrue();
        });

        it('RegisterComponent — personal form touched with error — returns true', () => {
            const ctrl = component['personalForm'].get('firstName');
            ctrl?.setValue('');
            ctrl?.markAsTouched();
            expect(component['hasError']('personal', 'firstName', 'required')).toBeTrue();
        });

        it('RegisterComponent — roleSpecific form control not touched — returns false', () => {
            expect(component['hasError']('roleSpecific', 'acceptTerms', 'required')).toBeFalse();
        });

        it('RegisterComponent — roleSpecific control touched with error — returns true', () => {
            const ctrl = component['roleSpecificForm'].get('acceptTerms');
            ctrl?.markAsTouched();
            expect(component['hasError']('roleSpecific', 'acceptTerms', 'required')).toBeTrue();
        });

        it('RegisterComponent — account form control not touched — returns false', () => {
            expect(component['hasError']('account', 'email', 'required')).toBeFalse();
        });
    });

    describe('togglePasswordVisibility', () => {
        it('RegisterComponent — toggle confirm — flips showConfirmPassword', () => {
            expect(component['showConfirmPassword']()).toBeFalse();
            component['togglePasswordVisibility']('confirm');
            expect(component['showConfirmPassword']()).toBeTrue();
            component['togglePasswordVisibility']('confirm');
            expect(component['showConfirmPassword']()).toBeFalse();
        });

        it('RegisterComponent — toggle password — flips showPassword', () => {
            expect(component['showPassword']()).toBeFalse();
            component['togglePasswordVisibility']('password');
            expect(component['showPassword']()).toBeTrue();
        });
    });
});
