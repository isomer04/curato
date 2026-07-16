import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DoctorAppointmentsComponent } from './appointments.component';
import { AppointmentService } from '../../../core/services/appointment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { InsuranceService } from '../../../core/services/insurance.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Appointment, AppointmentStatus, UserRole } from '../../../core/models';

const makeAppointment = (id: string, status: AppointmentStatus = AppointmentStatus.SCHEDULED): Appointment => ({
  id,
  patientId: 'pt-1',
  doctorId: 'dr-1',
  appointmentDate: '2025-06-01',
  startTime: '09:00',
  endTime: '09:30',
  status,
  reasonForVisit: 'Checkup',
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    id: 'pt-1',
    userId: 'u1',
    user: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'j@t.com', role: UserRole.PATIENT, isActive: true, isEmailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  } as unknown as Appointment['patient'],
});

describe('DoctorAppointmentsComponent', () => {
  let component: DoctorAppointmentsComponent;
  let fixture: ComponentFixture<DoctorAppointmentsComponent>;
  let mockAppointmentService: jasmine.SpyObj<AppointmentService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockInsuranceService: jasmine.SpyObj<InsuranceService>;

  beforeEach(async () => {
    mockAppointmentService = jasmine.createSpyObj('AppointmentService', [
      'getAppointments',
      'confirmAppointment',
      'completeAppointment',
      'cancelAppointment',
    ], {
      appointments: signal([]),
      isLoading: signal(false),
    });
    mockAppointmentService.getAppointments.and.returnValue(of({
      success: true,
      data: [],
      metadata: { total: 0, page: 1, limit: 50, totalPages: 0 },
    }));
    mockAppointmentService.confirmAppointment.and.returnValue(of({
      success: true,
      data: { appointment: makeAppointment('a1', AppointmentStatus.CONFIRMED) },
    }));
    mockAppointmentService.completeAppointment.and.returnValue(of({
      success: true,
      data: { appointment: makeAppointment('a1', AppointmentStatus.COMPLETED) },
    }));
    mockAppointmentService.cancelAppointment.and.returnValue(of({
      success: true,
      data: { appointment: makeAppointment('a1', AppointmentStatus.CANCELLED) },
    }));

    mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    mockInsuranceService = jasmine.createSpyObj('InsuranceService', ['getPatientInsurance']);
    mockInsuranceService.getPatientInsurance.and.returnValue(of({
      success: true,
      data: { insurances: [] },
    }));

    await TestBed.configureTestingModule({
      imports: [DoctorAppointmentsComponent],
      providers: [
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: InsuranceService, useValue: mockInsuranceService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorAppointmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('DoctorAppointmentsComponent — init', () => {
    it('DoctorAppointmentsComponent — ngOnInit — loads appointments on startup', () => {
      expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
    });
  });

  describe('DoctorAppointmentsComponent — loadAppointments — error cases', () => {
    it('DoctorAppointmentsComponent — getAppointments error — shows error notification', fakeAsync(() => {
      mockAppointmentService.getAppointments.and.returnValue(throwError(() => new Error('Network')));
      component['loadAppointments']();
      tick();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to load appointments');
    }));
  });

  describe('DoctorAppointmentsComponent — resetFilters', () => {
    it('DoctorAppointmentsComponent — resetFilters — clears all filter signals and reloads', () => {
      component['selectedStatus'].set('confirmed');
      component['startDate'].set('2025-01-01');
      component['endDate'].set('2025-12-31');

      component['resetFilters']();

      expect(component['selectedStatus']()).toBe('');
      expect(component['startDate']()).toBe('');
      expect(component['endDate']()).toBe('');
      expect(mockAppointmentService.getAppointments).toHaveBeenCalledTimes(2);
    });
  });

  describe('DoctorAppointmentsComponent — confirmAppointment', () => {
    it('DoctorAppointmentsComponent — confirmAppointment — success — shows success notification', fakeAsync(() => {
      const apt = makeAppointment('a1');
      component['confirmAppointment'](apt);
      tick();
      expect(mockAppointmentService.confirmAppointment).toHaveBeenCalledWith('a1');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Success', 'Appointment confirmed');
    }));

    it('DoctorAppointmentsComponent — confirmAppointment — error — shows error notification', fakeAsync(() => {
      mockAppointmentService.confirmAppointment.and.returnValue(throwError(() => new Error()));
      component['confirmAppointment'](makeAppointment('a1'));
      tick();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to confirm appointment');
    }));
  });

  describe('DoctorAppointmentsComponent — modals', () => {
    it('DoctorAppointmentsComponent — openCompleteModal — sets selected appointment and shows modal', () => {
      const apt = makeAppointment('a1');
      component['openCompleteModal'](apt);
      expect(component['selectedAppointment']()).toBe(apt);
      expect(component['showCompleteModal']()).toBeTrue();
      expect(component['completionNotes']()).toBe('');
      expect(component['prescriptions']()).toEqual([]);
    });

    it('DoctorAppointmentsComponent — openCancelModal — sets selected appointment and shows modal', () => {
      const apt = makeAppointment('a1');
      component['openCancelModal'](apt);
      expect(component['selectedAppointment']()).toBe(apt);
      expect(component['showCancelModal']()).toBeTrue();
      expect(component['cancellationReason']()).toBe('');
    });

    it('DoctorAppointmentsComponent — closeModals — hides all modals and clears selection', () => {
      component['showCompleteModal'].set(true);
      component['showCancelModal'].set(true);
      component['selectedAppointment'].set(makeAppointment('a1'));

      component['closeModals']();

      expect(component['showCompleteModal']()).toBeFalse();
      expect(component['showCancelModal']()).toBeFalse();
      expect(component['selectedAppointment']()).toBeNull();
    });
  });

  describe('DoctorAppointmentsComponent — prescriptions', () => {
    it('DoctorAppointmentsComponent — addPrescription — adds new blank prescription', () => {
      expect(component['prescriptions']().length).toBe(0);
      component['addPrescription']();
      expect(component['prescriptions']().length).toBe(1);
      expect(component['prescriptions']()[0].medication).toBe('');
    });

    it('DoctorAppointmentsComponent — removePrescription — removes at correct index', () => {
      component['prescriptions'].set([
        { medication: 'Drug A', dosage: '10mg', frequency: 'daily', duration: '5 days' },
        { medication: 'Drug B', dosage: '20mg', frequency: 'twice', duration: '3 days' },
      ]);
      component['removePrescription'](0);
      expect(component['prescriptions']().length).toBe(1);
      expect(component['prescriptions']()[0].medication).toBe('Drug B');
    });
  });

  describe('DoctorAppointmentsComponent — completeAppointment', () => {
    it('DoctorAppointmentsComponent — completeAppointment — no selected appointment — does nothing', () => {
      component['selectedAppointment'].set(null);
      component['completeAppointment']();
      expect(mockAppointmentService.completeAppointment).not.toHaveBeenCalled();
    });

    it('DoctorAppointmentsComponent — completeAppointment — success — dismisses modal and reloads', fakeAsync(() => {
      component['selectedAppointment'].set(makeAppointment('a1'));
      component['showCompleteModal'].set(true);
      component['completionNotes'].set('All good');

      component['completeAppointment']();
      tick();

      expect(mockAppointmentService.completeAppointment).toHaveBeenCalledWith('a1', 'All good', undefined);
      expect(mockNotificationService.success).toHaveBeenCalledWith('Success', 'Appointment completed');
      expect(component['showCompleteModal']()).toBeFalse();
    }));

    it('DoctorAppointmentsComponent — completeAppointment — valid prescriptions — includes them', fakeAsync(() => {
      component['selectedAppointment'].set(makeAppointment('a1'));
      component['prescriptions'].set([
        { medication: 'Aspirin', dosage: '100mg', frequency: 'daily', duration: '5 days' },
        { medication: '', dosage: '', frequency: '', duration: '' }, // invalid — no medication
      ]);

      component['completeAppointment']();
      tick();

      // Only the valid prescription should be sent
      const callArgs = mockAppointmentService.completeAppointment.calls.mostRecent().args;
      expect(callArgs[2]?.length).toBe(1);
    }));

    it('DoctorAppointmentsComponent — completeAppointment — error — shows error notification', fakeAsync(() => {
      mockAppointmentService.completeAppointment.and.returnValue(throwError(() => new Error()));
      component['selectedAppointment'].set(makeAppointment('a1'));
      component['completeAppointment']();
      tick();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to complete appointment');
    }));
  });

  describe('DoctorAppointmentsComponent — cancelAppointment', () => {
    it('DoctorAppointmentsComponent — cancelAppointment — no selected appointment — does nothing', () => {
      component['selectedAppointment'].set(null);
      component['cancellationReason'].set('valid reason here');
      component['cancelAppointment']();
      expect(mockAppointmentService.cancelAppointment).not.toHaveBeenCalled();
    });

    it('DoctorAppointmentsComponent — cancelAppointment — reason too short — does nothing', () => {
      component['selectedAppointment'].set(makeAppointment('a1'));
      component['cancellationReason'].set('short');
      component['cancelAppointment']();
      expect(mockAppointmentService.cancelAppointment).not.toHaveBeenCalled();
    });

    it('DoctorAppointmentsComponent — cancelAppointment — valid reason — cancels and reloads', fakeAsync(() => {
      component['selectedAppointment'].set(makeAppointment('a1'));
      component['cancellationReason'].set('Patient requested cancellation');
      component['showCancelModal'].set(true);

      component['cancelAppointment']();
      tick();

      expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith('a1', 'Patient requested cancellation');
      expect(mockNotificationService.success).toHaveBeenCalledWith('Success', 'Appointment cancelled');
      expect(component['showCancelModal']()).toBeFalse();
    }));

    it('DoctorAppointmentsComponent — cancelAppointment — error — shows error notification', fakeAsync(() => {
      mockAppointmentService.cancelAppointment.and.returnValue(throwError(() => new Error()));
      component['selectedAppointment'].set(makeAppointment('a1'));
      component['cancellationReason'].set('Patient requested cancellation');

      component['cancelAppointment']();
      tick();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to cancel appointment');
    }));
  });

  describe('DoctorAppointmentsComponent — viewMode', () => {
    it('DoctorAppointmentsComponent — initial viewMode — defaults to list', () => {
      expect(component['viewMode']()).toBe('list');
    });
  });
});
