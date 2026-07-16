/**
 * AppointmentListComponent Unit Tests
 */
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppointmentListComponent } from './appointment-list.component';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Appointment, AppointmentStatus, UserRole } from '../../../../core/models';

const makeAppointment = (id: string, status: AppointmentStatus = AppointmentStatus.SCHEDULED, date = '2025-06-01'): Appointment => ({
    id,
    patientId: 'pt-1',
    doctorId: 'dr-1',
    appointmentDate: date,
    startTime: '09:00',
    endTime: '09:30',
    status,
    reasonForVisit: 'Checkup',
    createdAt: new Date(),
    updatedAt: new Date(),
    doctor: {
        id: 'dr-1',
        userId: 'u-dr',
        specialization: 'Cardiology',
        licenseNumber: 'L1',
        yearsOfExperience: 5,
        consultationFee: 100,
        rating: 4.5,
        totalPatients: 10,
        qualifications: [],
        languages: [{ language: 'English' }],
        user: {
            id: 'u-dr',
            firstName: 'Dr',
            lastName: 'Smith',
            email: 'dr@test.com',
            role: UserRole.DOCTOR,
            isActive: true,
            isEmailVerified: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    },
});

describe('AppointmentListComponent', () => {
    let component: AppointmentListComponent;
    let fixture: ComponentFixture<AppointmentListComponent>;
    let mockAppointmentService: jasmine.SpyObj<AppointmentService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    beforeEach(async () => {
        mockAppointmentService = jasmine.createSpyObj('AppointmentService', ['getAppointments', 'cancelAppointment'], {
            isLoading: signal(false),
        });
        mockAppointmentService.getAppointments.and.returnValue(of({
            success: true,
            data: [],
            message: 'Success',
            metadata: { total: 0, page: 1, limit: 10, totalPages: 0 }
        }));
        mockAppointmentService.cancelAppointment.and.returnValue(of({
            success: true,
            data: { appointment: makeAppointment('a1', AppointmentStatus.CANCELLED) },
            message: 'Cancelled'
        }));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [AppointmentListComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentService, useValue: mockAppointmentService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AppointmentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load appointments on init', () => {
        expect(mockAppointmentService.getAppointments).toHaveBeenCalled();
    });

    it('AppointmentListComponent — loadAppointments — error — shows error notification', fakeAsync(() => {
        mockAppointmentService.getAppointments.and.returnValue(throwError(() => new Error('Network')));
        component['loadAppointments']();
        tick();
        expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to load your appointments');
    }));

    describe('filter setFilter', () => {
        it('should filter appointments by status', () => {
            component['setFilter']('upcoming');
            expect(component['selectedFilter']()).toBe('upcoming');
        });

        it('AppointmentListComponent — setFilter all — includes all appointments', () => {
            const appts = [
                makeAppointment('a1', AppointmentStatus.SCHEDULED),
                makeAppointment('a2', AppointmentStatus.COMPLETED),
                makeAppointment('a3', AppointmentStatus.CANCELLED),
            ];
            component['allAppointments'].set(appts);
            component['setFilter']('all');
            expect(component['filteredAppointments']().length).toBe(3);
        });

        it('AppointmentListComponent — setFilter upcoming — shows scheduled and confirmed only', () => {
            component['allAppointments'].set([
                makeAppointment('a1', AppointmentStatus.SCHEDULED),
                makeAppointment('a2', AppointmentStatus.CONFIRMED),
                makeAppointment('a3', AppointmentStatus.COMPLETED),
            ]);
            component['setFilter']('upcoming');
            expect(component['filteredAppointments']().length).toBe(2);
        });

        it('AppointmentListComponent — setFilter completed — shows completed only', () => {
            component['allAppointments'].set([
                makeAppointment('a1', AppointmentStatus.SCHEDULED),
                makeAppointment('a2', AppointmentStatus.COMPLETED),
            ]);
            component['setFilter']('completed');
            expect(component['filteredAppointments']().length).toBe(1);
        });

        it('AppointmentListComponent — setFilter cancelled — shows cancelled only', () => {
            component['allAppointments'].set([
                makeAppointment('a1', AppointmentStatus.SCHEDULED),
                makeAppointment('a2', AppointmentStatus.CANCELLED),
            ]);
            component['setFilter']('cancelled');
            expect(component['filteredAppointments']().length).toBe(1);
        });
    });

    describe('search', () => {
        it('should update search term', () => {
            const mockEvent = { target: { value: 'Smith' } } as unknown as Event;
            component['onSearch'](mockEvent);
            expect(component['searchTerm']()).toBe('Smith');
        });

        it('AppointmentListComponent — search by doctor name — filters correctly', () => {
            component['allAppointments'].set([makeAppointment('a1'), makeAppointment('a2')]);
            const mockEvent = { target: { value: 'Smith' } } as unknown as Event;
            component['onSearch'](mockEvent);
            expect(component['filteredAppointments']().length).toBe(2); // both have doctor Smith
        });

        it('AppointmentListComponent — search with no match — returns empty', () => {
            component['allAppointments'].set([makeAppointment('a1')]);
            const mockEvent = { target: { value: 'Nonexistent Doctor' } } as unknown as Event;
            component['onSearch'](mockEvent);
            expect(component['filteredAppointments']().length).toBe(0);
        });
    });

    describe('cancelation modal', () => {
        it('AppointmentListComponent — openCancelModal — sets appointment and clears reason', () => {
            const apt = makeAppointment('a1');
            component['openCancelModal'](apt);
            expect(component['selectedAppointment']()).toBe(apt);
            expect(component['cancellationReason']()).toBe('');
        });

        it('AppointmentListComponent — closeCancelModal — clears appointment and reason', () => {
            component['selectedAppointment'].set(makeAppointment('a1'));
            component['cancellationReason'].set('some reason');
            component['closeCancelModal']();
            expect(component['selectedAppointment']()).toBeNull();
            expect(component['cancellationReason']()).toBe('');
        });

        it('AppointmentListComponent — confirmCancel — reason too short — does nothing', () => {
            component['selectedAppointment'].set(makeAppointment('a1'));
            component['cancellationReason'].set('short');
            component['confirmCancel']();
            expect(mockAppointmentService.cancelAppointment).not.toHaveBeenCalled();
        });

        it('AppointmentListComponent — confirmCancel — no appointment — does nothing', () => {
            component['selectedAppointment'].set(null);
            component['cancellationReason'].set('I need to cancel this appointment');
            component['confirmCancel']();
            expect(mockAppointmentService.cancelAppointment).not.toHaveBeenCalled();
        });

        it('AppointmentListComponent — confirmCancel — valid — cancels and reloads', fakeAsync(() => {
            component['selectedAppointment'].set(makeAppointment('a1'));
            component['cancellationReason'].set('Patient requested cancellation');
            component['confirmCancel']();
            tick();
            expect(mockAppointmentService.cancelAppointment).toHaveBeenCalledWith('a1', 'Patient requested cancellation');
            expect(mockNotificationService.success).toHaveBeenCalledWith('Cancelled', 'Appointment cancelled successfully');
        }));

        it('AppointmentListComponent — confirmCancel — error — shows notification', fakeAsync(() => {
            mockAppointmentService.cancelAppointment.and.returnValue(throwError(() => new Error('Server error')));
            component['selectedAppointment'].set(makeAppointment('a1'));
            component['cancellationReason'].set('Patient requested cancellation');
            component['confirmCancel']();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to cancel appointment');
        }));
    });

    describe('details modal', () => {
        it('AppointmentListComponent — openDetailsModal — sets viewing appointment', () => {
            const apt = makeAppointment('a1');
            component['openDetailsModal'](apt);
            expect(component['viewingAppointment']()).toBe(apt);
        });

        it('AppointmentListComponent — closeDetailsModal — clears viewing appointment', () => {
            component['viewingAppointment'].set(makeAppointment('a1'));
            component['closeDetailsModal']();
            expect(component['viewingAppointment']()).toBeNull();
        });
    });

    describe('sorting', () => {
        it('AppointmentListComponent — filteredAppointments — sorts by date descending', () => {
            component['allAppointments'].set([
                makeAppointment('a1', AppointmentStatus.SCHEDULED, '2025-01-01'),
                makeAppointment('a2', AppointmentStatus.SCHEDULED, '2025-06-01'),
            ]);
            const results = component['filteredAppointments']();
            expect(results[0].id).toBe('a2'); // Newer date first
        });
    });
});
