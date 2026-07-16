/**
 * BookAppointmentComponent Unit Tests
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookAppointmentComponent } from './book-appointment.component';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { Appointment, Doctor, UserRole } from '../../../../core/models';

describe('BookAppointmentComponent', () => {
  let component: BookAppointmentComponent;
  let fixture: ComponentFixture<BookAppointmentComponent>;
  let mockAppointmentService: jasmine.SpyObj<AppointmentService>;
  let mockDoctorService: jasmine.SpyObj<DoctorService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let router: Router;

  const mockDoctor: Doctor = {
    id: 'd1',
    userId: 'u1',
    firstName: 'John',
    lastName: 'Doe',
    specialization: 'Cardiology',
    licenseNumber: 'L123',
    yearsOfExperience: 10,
    consultationFee: 100,
    rating: 4.5,
    totalPatients: 100,
    qualifications: [],
    languages: [{ language: 'English' }],
    user: {
      id: 'u1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'doc@test.com',
      role: UserRole.DOCTOR,
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    mockAppointmentService = jasmine.createSpyObj('AppointmentService', [
      'getAvailableSlots',
      'createAppointment',
    ]);
    mockAppointmentService.getAvailableSlots.and.returnValue(
      of({
        success: true,
        data: { slots: ['09:00', '10:00'] },
        message: 'Success',
      }),
    );
    mockAppointmentService.createAppointment.and.returnValue(
      of({
        success: true,
        data: { appointment: {} as unknown as Appointment },
        message: 'Success',
      }),
    );

    mockDoctorService = jasmine.createSpyObj('DoctorService', ['getDoctors']);
    mockDoctorService.getDoctors.and.returnValue(
      of({
        success: true,
        data: [mockDoctor],
        metadata: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    );

    mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [BookAppointmentComponent],
      providers: [
        provideRouter([]),
        { provide: AppointmentService, useValue: mockAppointmentService },
        { provide: DoctorService, useValue: mockDoctorService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookAppointmentComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load doctors on init', () => {
    // Doctor loading happens on init
    expect(component['doctors']()).toBeDefined();
  });

  it('BookAppointmentComponent — loadDoctors — success — populates doctors and filteredDoctors', () => {
    expect(component['doctors']().length).toBe(1);
    expect(component['filteredDoctors']().length).toBe(1);
    expect(component['isLoadingDoctors']()).toBe(false);
  });

  it('BookAppointmentComponent — loadDoctors — error — sets doctorLoadError', () => {
    mockDoctorService.getDoctors.and.returnValue(throwError(() => new Error('Network')));
    component['loadDoctors']();
    expect(component['doctorLoadError']()).toBe(true);
    expect(component['isLoadingDoctors']()).toBe(false);
  });

  it('BookAppointmentComponent — retryLoadDoctors — calls loadDoctors again', () => {
    spyOn<BookAppointmentComponent>(component as BookAppointmentComponent, 'loadDoctors' as never);
    component['retryLoadDoctors']();
    expect(component['loadDoctors']).toHaveBeenCalled();
  });

  it('should filter doctors by search term', () => {
    component['searchTerm'].set('Doe');
    expect(component['filteredDoctors']().length).toBe(1);
  });

  it('BookAppointmentComponent — filterDoctors — no match — returns empty', () => {
    component['searchTerm'].set('Zzznomatch');
    expect(component['filteredDoctors']().length).toBe(0);
  });

  it('BookAppointmentComponent — filterDoctors — by specialization — filters correctly', () => {
    component['searchTerm'].set('');
    component['selectedSpecialization'].set('Neurology');
    expect(component['filteredDoctors']().length).toBe(0);
  });

  it('BookAppointmentComponent — filterDoctors — matching specialization — returns match', () => {
    component['searchTerm'].set('');
    component['selectedSpecialization'].set('Cardiology');
    expect(component['filteredDoctors']().length).toBe(1);
  });

  it('should select a doctor', () => {
    const doc = component['doctors']()[0];
    if (doc) {
      component['selectDoctor'](doc);
      expect(component['selectedDoctor']()).toBe(doc);
      expect(component['selectedSlot']()).toBeNull();
    }
  });

  it('BookAppointmentComponent — selectDoctor — with date already set — loads slots', () => {
    const doc = component['doctors']()[0];
    component['bookingForm'].get('appointmentDate')?.setValue('2025-12-01');
    component['selectDoctor'](doc!);
    expect(mockAppointmentService.getAvailableSlots).toHaveBeenCalled();
  });

  it('BookAppointmentComponent — loadAvailableSlots — no doctor — does nothing', () => {
    component['selectedDoctor'].set(null);
    component['bookingForm'].get('appointmentDate')?.setValue('2025-12-01');
    mockAppointmentService.getAvailableSlots.calls.reset();
    component['loadAvailableSlots']();
    expect(mockAppointmentService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('BookAppointmentComponent — loadAvailableSlots — no date — does nothing', () => {
    component['selectedDoctor'].set(mockDoctor);
    component['bookingForm'].get('appointmentDate')?.setValue('');
    mockAppointmentService.getAvailableSlots.calls.reset();
    component['loadAvailableSlots']();
    expect(mockAppointmentService.getAvailableSlots).not.toHaveBeenCalled();
  });

  it('BookAppointmentComponent — loadAvailableSlots — success — populates slots', () => {
    component['selectedDoctor'].set(mockDoctor);
    component['bookingForm'].get('appointmentDate')?.setValue('2025-12-01');
    component['loadAvailableSlots']();
    expect(component['availableSlots']()).toEqual(['09:00', '10:00']);
    expect(component['isLoadingSlots']()).toBe(false);
  });

  it('BookAppointmentComponent — loadAvailableSlots — error — sets slotLoadError', () => {
    mockAppointmentService.getAvailableSlots.and.returnValue(throwError(() => new Error('Server')));
    component['selectedDoctor'].set(mockDoctor);
    component['bookingForm'].get('appointmentDate')?.setValue('2025-12-01');
    component['loadAvailableSlots']();
    expect(component['slotLoadError']()).toBe(true);
  });

  it('BookAppointmentComponent — selectSlot — sets selectedSlot', () => {
    component['selectSlot']('10:00');
    expect(component['selectedSlot']()).toBe('10:00');
  });

  it('BookAppointmentComponent — onSubmit — invalid form — does nothing', () => {
    component['onSubmit']();
    expect(mockAppointmentService.createAppointment).not.toHaveBeenCalled();
  });

  it('BookAppointmentComponent — onSubmit — valid form — creates appointment and navigates', () => {
    component['selectedDoctor'].set(mockDoctor);
    component['selectedSlot'].set('09:00');
    component['bookingForm'].patchValue({ appointmentDate: '2025-12-01', reasonForVisit: 'Routine checkup for health' });
    component['onSubmit']();
    expect(mockAppointmentService.createAppointment).toHaveBeenCalled();
    expect(mockNotificationService.success).toHaveBeenCalledWith('Success', 'Appointment booked successfully!');
    expect(router.navigate).toHaveBeenCalledWith(['/patient/appointments']);
  });

  it('BookAppointmentComponent — onSubmit — API error — resets isSubmitting', () => {
    mockAppointmentService.createAppointment.and.returnValue(throwError(() => new Error('Server')));
    component['selectedDoctor'].set(mockDoctor);
    component['selectedSlot'].set('09:00');
    component['bookingForm'].patchValue({ appointmentDate: '2025-12-01', reasonForVisit: 'Routine checkup for health' });
    component['onSubmit']();
    expect(component['isSubmitting']()).toBe(false);
  });

  it('BookAppointmentComponent — getDoctorInitials — returns initials', () => {
    const doc: Doctor = { ...mockDoctor, firstName: 'Jane', lastName: 'Doe' };
    expect(component['getDoctorInitials'](doc)).toBe('JD');
  });

  it('BookAppointmentComponent — getDoctorName — returns formatted name', () => {
    const doc: Doctor = { ...mockDoctor, firstName: 'Jane', lastName: 'Doe' };
    expect(component['getDoctorName'](doc)).toContain('Jane');
  });

  it('BookAppointmentComponent — hasError — returns false for untouched control', () => {
    expect(component['hasError']('reasonForVisit', 'required')).toBe(false);
  });

  it('BookAppointmentComponent — hasError — returns true for touched invalid control', () => {
    const control = component['bookingForm'].get('reasonForVisit')!;
    control.markAsTouched();
    control.setValue('');
    expect(component['hasError']('reasonForVisit', 'required')).toBe(true);
  });
});
