/**
 * PatientDashboardComponent Unit Tests
 *
 * Tests for the patient dashboard component.
 * Covers:
 * - Component creation
 * - Statistics calculation
 * - Appointment display
 * - Status badge styling
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PatientDashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Appointment, AppointmentStatus, UserRole } from '../../../core/models';
import { StatusBadgePipe } from '../../../shared/pipes/status-badge.pipe';

describe('PatientDashboardComponent', () => {
  let component: PatientDashboardComponent;
  let fixture: ComponentFixture<PatientDashboardComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockAppointmentService: jasmine.SpyObj<AppointmentService>;

  const mockUser = {
    id: '1',
    email: 'patient@example.com',
    role: UserRole.PATIENT,
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    isEmailVerified: true,
    mfaEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAppointments = [
    {
      id: '1',
      status: AppointmentStatus.SCHEDULED,
      appointmentDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '09:30',
      reasonForVisit: 'Checkup',
      patientId: '1',
      doctorId: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      doctor: {
        id: '1',
        userId: '1',
        firstName: 'Jane',
        lastName: 'Smith',
        specialization: 'General Medicine',
        licenseNumber: 'L001',
        qualifications: [],
        languages: [{ language: 'English' }],
        yearsOfExperience: 10,
        consultationFee: 100,
        rating: 4.5,
        totalPatients: 100,
        user: {
          id: '1',
          email: 'dr.smith@example.com',
          role: UserRole.DOCTOR,
          firstName: 'Jane',
          lastName: 'Smith',
          isActive: true,
          isEmailVerified: true,
          mfaEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    },
  ];

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout'], {
      isAuthenticated: signal(true),
      currentUser: signal(mockUser),
    });

    mockAppointmentService = jasmine.createSpyObj(
      'AppointmentService',
      ['getAppointments', 'getDashboardStats'],
      {
        isLoading: signal(false),
        upcomingAppointments: signal(mockAppointments),
      },
    );
    mockAppointmentService.getAppointments.and.returnValue(
      of({
        success: true,
        data: mockAppointments,
        metadata: {
          total: mockAppointments.length,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        message: 'Success',
      }),
    );
    mockAppointmentService.getDashboardStats.and.returnValue(
      of({
        success: true,
        data: {
          stats: {
            scheduled: 1,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            no_show: 0,
          },
        },
        message: 'Success',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [PatientDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppointmentService, useValue: mockAppointmentService },
      ],
    })
      .overrideComponent(PatientDashboardComponent, {
        set: { providers: [{ provide: AppointmentService, useValue: mockAppointmentService }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PatientDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load appointments on init', () => {
    expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
  });

  it('should display welcome message with user name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('John');
  });

  describe('StatusBadgePipe (used in template)', () => {
    let pipe: StatusBadgePipe;
    beforeEach(() => {
      pipe = new StatusBadgePipe();
    });

    it('should return correct class for SCHEDULED status', () => {
      expect(pipe.transform(AppointmentStatus.SCHEDULED)).toBe('status-scheduled');
    });

    it('should return correct class for COMPLETED status', () => {
      expect(pipe.transform(AppointmentStatus.COMPLETED)).toBe('status-completed');
    });

    it('should return correct class for CANCELLED status', () => {
      expect(pipe.transform(AppointmentStatus.CANCELLED)).toBe('status-cancelled');
    });
  });

  describe('getDoctorInitials', () => {
    it('should return correct initials', () => {
      const result = component['getDoctorInitials'](mockAppointments[0] as Appointment);
      expect(result).toBe('JS');
    });
  });
});
