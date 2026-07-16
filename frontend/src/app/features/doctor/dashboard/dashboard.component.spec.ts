/**
 * DoctorDashboardComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DoctorDashboardComponent } from './dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { UserRole, AppointmentStatus } from '../../../core/models';

describe('DoctorDashboardComponent', () => {
  let component: DoctorDashboardComponent;
  let fixture: ComponentFixture<DoctorDashboardComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockAppointmentService: jasmine.SpyObj<AppointmentService>;

  const mockUser = {
    id: '1',
    email: 'doctor@example.com',
    role: UserRole.DOCTOR,
    firstName: 'Jane',
    lastName: 'Smith',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout'], {
      isAuthenticated: signal(true),
      currentUser: signal(mockUser),
    });

    mockAppointmentService = jasmine.createSpyObj('AppointmentService', ['getAppointments'], {
      isLoading: signal(false),
      upcomingAppointments: signal([]),
    });
    mockAppointmentService.getAppointments.and.returnValue(
      of({
        success: true,
        data: [],
        metadata: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
        message: 'Success',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [DoctorDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppointmentService, useValue: mockAppointmentService },
      ],
    })
      .overrideComponent(DoctorDashboardComponent, {
        set: { providers: [{ provide: AppointmentService, useValue: mockAppointmentService }] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DoctorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load appointments on init', () => {
    expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
  });

  it('should display doctor name in welcome message', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Smith');
  });

  describe('getGreeting', () => {
    it('should return morning for hours before 12', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2024, 0, 1, 9, 0, 0));

      expect(component['getGreeting']()).toBe('morning');

      jasmine.clock().uninstall();
    });

    it('should return afternoon for hours 12-17', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2024, 0, 1, 14, 0, 0));

      expect(component['getGreeting']()).toBe('afternoon');

      jasmine.clock().uninstall();
    });

    it('should return evening for hours 18+', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2024, 0, 1, 20, 0, 0));

      expect(component['getGreeting']()).toBe('evening');

      jasmine.clock().uninstall();
    });
  });

  describe('calculateStats (via loadDashboardData)', () => {
    const today = new Date().toISOString().split('T')[0];

    const makeAppt = (id: string, status: AppointmentStatus, patientId: string, date = today) => ({
      id,
      patientId,
      doctorId: 'dr-1',
      appointmentDate: date,
      startTime: '09:00',
      endTime: '09:30',
      status,
      reasonForVisit: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('DoctorDashboardComponent — calculateStats — counts today appointments', () => {
      mockAppointmentService.getAppointments.and.returnValue(
        of({
          success: true,
          data: [makeAppt('a1', AppointmentStatus.SCHEDULED, 'pt-1'), makeAppt('a2', AppointmentStatus.CONFIRMED, 'pt-2')],
          metadata: { total: 2, page: 1, limit: 100, totalPages: 1 },
          message: 'OK',
        }),
      );
      component['loadDashboardData']();
      expect(component['stats']().todayCount).toBe(2);
    });

    it('DoctorDashboardComponent — calculateStats — counts pending confirmations', () => {
      mockAppointmentService.getAppointments.and.returnValue(
        of({
          success: true,
          data: [makeAppt('a1', AppointmentStatus.SCHEDULED, 'pt-1'), makeAppt('a2', AppointmentStatus.CONFIRMED, 'pt-2')],
          metadata: { total: 2, page: 1, limit: 100, totalPages: 1 },
          message: 'OK',
        }),
      );
      component['loadDashboardData']();
      expect(component['stats']().pendingConfirmation).toBe(1);
    });

    it('DoctorDashboardComponent — calculateStats — counts completed this week', () => {
      mockAppointmentService.getAppointments.and.returnValue(
        of({
          success: true,
          data: [makeAppt('a1', AppointmentStatus.COMPLETED, 'pt-1'), makeAppt('a2', AppointmentStatus.COMPLETED, 'pt-2')],
          metadata: { total: 2, page: 1, limit: 100, totalPages: 1 },
          message: 'OK',
        }),
      );
      component['loadDashboardData']();
      expect(component['stats']().completedThisWeek).toBe(2);
    });

    it('DoctorDashboardComponent — calculateStats — counts unique patients', () => {
      mockAppointmentService.getAppointments.and.returnValue(
        of({
          success: true,
          data: [makeAppt('a1', AppointmentStatus.SCHEDULED, 'pt-1'), makeAppt('a2', AppointmentStatus.COMPLETED, 'pt-1')],
          metadata: { total: 2, page: 1, limit: 100, totalPages: 1 },
          message: 'OK',
        }),
      );
      component['loadDashboardData']();
      expect(component['stats']().totalPatients).toBe(1);
    });

    it('DoctorDashboardComponent — calculateStats — appt without patientId — not counted', () => {
      const appt = { ...makeAppt('a1', AppointmentStatus.SCHEDULED, 'pt-1'), patientId: '' };
      mockAppointmentService.getAppointments.and.returnValue(
        of({
          success: true,
          data: [appt],
          metadata: { total: 1, page: 1, limit: 100, totalPages: 1 },
          message: 'OK',
        }),
      );
      component['loadDashboardData']();
      expect(component['stats']().totalPatients).toBe(0);
    });

    it('DoctorDashboardComponent — calculateStats — appointment not today — not counted', () => {
      mockAppointmentService.getAppointments.and.returnValue(
        of({
          success: true,
          data: [makeAppt('a1', AppointmentStatus.SCHEDULED, 'pt-1', '2020-01-01')],
          metadata: { total: 1, page: 1, limit: 100, totalPages: 1 },
          message: 'OK',
        }),
      );
      component['loadDashboardData']();
      expect(component['stats']().todayCount).toBe(0);
    });
  });

  describe('getPatientInitials and getPatientName', () => {
    const makeAppt = (firstName: string, lastName: string) => ({
      id: 'a1',
      patientId: 'pt-1',
      doctorId: 'dr-1',
      appointmentDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '09:30',
      status: 'scheduled' as const,
      reasonForVisit: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: {
        id: 'pt-1',
        userId: 'u-pt',
        dateOfBirth: new Date('1990-01-01'),
        allergies: [],
        user: { id: 'u-pt', firstName, lastName, email: 't@t.com', role: 'patient', isActive: true, isEmailVerified: true, createdAt: '', updatedAt: '' },
      },
    });

    it('DoctorDashboardComponent — getPatientInitials — returns initials', () => {
      expect(component['getPatientInitials'](makeAppt('John', 'Doe') as never)).toBe('JD');
    });

    it('DoctorDashboardComponent — getPatientInitials — no patient — returns empty string', () => {
      const appt = { id: 'a1', patientId: 'pt-1', doctorId: 'dr-1', appointmentDate: '', startTime: '', endTime: '', status: 'scheduled' as const, reasonForVisit: '', createdAt: new Date(), updatedAt: new Date() };
      expect(component['getPatientInitials'](appt)).toBe('');
    });

    it('DoctorDashboardComponent — getPatientName — returns full name', () => {
      expect(component['getPatientName'](makeAppt('Jane', 'Smith') as never)).toBe('Jane Smith');
    });

    it('DoctorDashboardComponent — getPatientName — no patient — returns empty', () => {
      const appt = { id: 'a1', patientId: 'pt-1', doctorId: 'dr-1', appointmentDate: '', startTime: '', endTime: '', status: 'scheduled' as const, reasonForVisit: '', createdAt: new Date(), updatedAt: new Date() };
      expect(component['getPatientName'](appt)).toBe('');
    });
  });
});
