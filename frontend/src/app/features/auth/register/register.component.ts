/**
 * RegisterComponent
 *
 * Multi-step registration form that handles user signup for patients and doctors.
 *
 * Registration Flow:
 * 1. Account Type Selection (Patient or Doctor)
 * 2. Basic Information (Email, Password)
 * 3. Profile Details (Name, Contact, etc.)
 * 4. Role-Specific Information (Medical history for patients, credentials for doctors)
 *
 * Features:
 * - Step-by-step wizard interface
 * - Real-time validation
 * - Password strength indicator
 * - Terms of service acceptance
 *
 * Security:
 * - Password validation enforced
 * - Email uniqueness checked on backend
 * - Form data cleared on successful registration
 */
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoggerService } from '../../../core/services/logger.service';
import { UserRole, Gender, PatientRegisterData, DoctorRegisterData } from '../../../core/models';
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
} from '../../../core/constants';

/**
 * Total number of registration steps.
 * Used for progress calculation and validation.
 */
const TOTAL_STEPS = 3;

/**
 * Available medical specializations for doctor registration.
 * This list should match the backend enum/validation.
 */
const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Family Medicine',
  'General Medicine',
  'Internal Medicine',
  'Neurology',
  'Obstetrics & Gynecology',
  'Oncology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Radiology',
  'Surgery',
] as const;

@Component({
  selector: 'app-register',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);

  /** Current step in the registration wizard (1-indexed) */
  protected readonly currentStep = signal(1);

  /** Total number of registration steps */
  protected readonly totalSteps = TOTAL_STEPS;

  /** Loading state during form submission */
  protected readonly isLoading = signal(false);

  /** Toggle password visibility */
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  /** Available specializations for doctor registration */
  protected readonly specializations = SPECIALIZATIONS;

  /** Available gender options */
  protected readonly genderOptions = Object.values(Gender);

  /** Available user roles for registration */
  protected readonly roleOptions = [
    {
      value: UserRole.PATIENT,
      label: 'Patient',
      description: 'Book appointments and manage your health',
    },
    { value: UserRole.DOCTOR, label: 'Doctor', description: 'Manage patients and appointments' },
  ];

  /**
   * Step 1: Account type and credentials form
   */
  protected readonly accountForm = this.fb.nonNullable.group(
    {
      role: [UserRole.PATIENT as UserRole, Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(MIN_PASSWORD_LENGTH),
          Validators.maxLength(MAX_PASSWORD_LENGTH),
          this.passwordStrengthValidator,
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator },
  );

  /**
   * Step 2: Personal information form
   */
  protected readonly personalForm = this.fb.nonNullable.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(MIN_NAME_LENGTH),
        Validators.maxLength(MAX_NAME_LENGTH),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(MIN_NAME_LENGTH),
        Validators.maxLength(MAX_NAME_LENGTH),
      ],
    ],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s-]{10,}$/)]],
    dateOfBirth: ['', Validators.required],
    gender: ['' as Gender | '', Validators.required],
    address: [''],
  });

  /**
   * Step 3: Role-specific information form
   * For patients: medical history, allergies, emergency contact
   * For doctors: specialization, license, qualifications
   */
  protected readonly roleSpecificForm = this.fb.nonNullable.group({
    // Patient fields
    bloodType: [''],
    allergies: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    // Doctor fields
    specialization: [''],
    licenseNumber: [''],
    yearsOfExperience: [0],
    consultationFee: [0],
    qualifications: [''],
    // Common
    acceptTerms: [false, Validators.requiredTrue],
  });

  /** Selected role for conditional form display */
  protected readonly selectedRole = computed(() => this.accountForm.get('role')?.value);

  /** Progress percentage for the progress bar */
  protected readonly progressPercentage = computed(
    () => (this.currentStep() / this.totalSteps) * 100,
  );

  /**
   * Move to the next registration step.
   * Validates the current step's form before proceeding.
   */
  protected nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep.update((step) => Math.min(step + 1, this.totalSteps));
    }
  }

  /**
   * Move to the previous registration step.
   */
  protected previousStep(): void {
    this.currentStep.update((step) => Math.max(step - 1, 1));
  }

  /**
   * Go to a specific step (for step indicator clicks).
   * Only allows going back to previous steps.
   */
  protected goToStep(step: number): void {
    if (step < this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  /**
   * Validate the current step's form.
   * Marks all fields as touched to show validation errors.
   */
  private validateCurrentStep(): boolean {
    const forms = [this.accountForm, this.personalForm, this.roleSpecificForm];
    const currentForm = forms[this.currentStep() - 1];

    if (currentForm) {
      currentForm.markAllAsTouched();
      return currentForm.valid;
    }
    return false;
  }

  /**
   * Handle form submission on the final step.
   */
  protected onSubmit(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.isLoading.set(true);

    const selectedRole = this.accountForm.getRawValue().role;
    const registrationObservable =
      selectedRole === UserRole.PATIENT
        ? this.authService.registerPatient(this.buildPatientRegistrationData())
        : this.authService.registerDoctor(this.buildDoctorRegistrationData());

    registrationObservable.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.notificationService.success(
          'Registration Successful!',
          'Account created successfully. Welcome!',
        );
        this.router.navigate(['/']); // Navigate to dashboard/home instead of login since we auto-login
      },
      error: (error) => {
        this.isLoading.set(false);
        this.logger.error('Registration failed:', error);

        const errorMessage = error.error?.message || 'Registration failed. Please try again.';
        this.notificationService.error('Registration Failed', errorMessage);
      },
    });
  }

  /**
   * Build the registration data object from all form values.
   * Returns a strongly typed object that will be sent to the API.
   */
  private buildBaseRegistrationData() {
    const account = this.accountForm.getRawValue();
    const personal = this.personalForm.getRawValue();

    return {
      email: account.email,
      password: account.password,
      confirmPassword: account.confirmPassword,
      firstName: personal.firstName,
      lastName: personal.lastName,
      phoneNumber: personal.phone,
    };
  }

  private buildPatientRegistrationData(): PatientRegisterData {
    const personal = this.personalForm.getRawValue();
    const roleSpecific = this.roleSpecificForm.getRawValue();

    // Ensure dateOfBirth is in ISO-8601 format with Zulu timezone for backend validation
    const dobString = personal.dateOfBirth ? new Date(personal.dateOfBirth).toISOString() : '';

    const bloodGroup = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(
      roleSpecific.bloodType,
    )
      ? (roleSpecific.bloodType as PatientRegisterData['bloodGroup'])
      : undefined;

    return {
      ...this.buildBaseRegistrationData(),
      dateOfBirth: dobString,
      gender: personal.gender as PatientRegisterData['gender'],
      bloodGroup,
      allergies: roleSpecific.allergies
        ? roleSpecific.allergies.split(',').map((a) => a.trim())
        : [],
      emergencyContactName: roleSpecific.emergencyContactName,
      emergencyContactPhone: roleSpecific.emergencyContactPhone,
    };
  }

  private buildDoctorRegistrationData(): DoctorRegisterData {
    const roleSpecific = this.roleSpecificForm.getRawValue();

    return {
      ...this.buildBaseRegistrationData(),
      specialization: roleSpecific.specialization,
      licenseNumber: roleSpecific.licenseNumber,
      yearsOfExperience: roleSpecific.yearsOfExperience,
      consultationFee: roleSpecific.consultationFee,
    };
  }

  /**
   * Custom validator for password strength.
   * Requires uppercase, lowercase, number, and special character.
   */
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const errors: Record<string, boolean> = {};

    if (!/[A-Z]/.test(password)) errors['noUppercase'] = true;
    if (!/[a-z]/.test(password)) errors['noLowercase'] = true;
    if (!/[0-9]/.test(password)) errors['noNumber'] = true;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors['noSpecial'] = true;

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /**
   * Validator to ensure password and confirm password match.
   */
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  /**
   * Get password strength as a percentage for the strength indicator.
   */
  protected getPasswordStrength(): number {
    const password = this.accountForm.get('password')?.value || '';
    let strength = 0;

    if (password.length >= MIN_PASSWORD_LENGTH) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;

    return strength;
  }

  /**
   * Get the CSS class for the password strength indicator.
   */
  protected getPasswordStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength <= 25) return 'bg-danger';
    if (strength <= 50) return 'bg-warning';
    if (strength <= 75) return 'bg-info';
    return 'bg-success';
  }

  /**
   * Check if a form control has a specific error.
   */
  protected hasError(
    formName: 'account' | 'personal' | 'roleSpecific',
    controlName: string,
    errorName: string,
  ): boolean {
    let control;

    switch (formName) {
      case 'account':
        control = this.accountForm.get(controlName);
        break;
      case 'personal':
        control = this.personalForm.get(controlName);
        break;
      case 'roleSpecific':
        control = this.roleSpecificForm.get(controlName);
        break;
    }

    return control ? control.hasError(errorName) && control.touched : false;
  }

  /**
   * Toggle password visibility.
   */
  protected togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword.update((show) => !show);
    } else {
      this.showConfirmPassword.update((show) => !show);
    }
  }
}
