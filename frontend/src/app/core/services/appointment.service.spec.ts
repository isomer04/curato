import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AppointmentService } from './appointment.service';
import { environment } from '../../../environments/environment';
import { AppointmentStatus, Appointment, Prescription } from '../models';

describe('AppointmentService', () => {
    let service: AppointmentService;
    let httpMock: HttpTestingController;

    const mockAppointment: Appointment = {
        id: '100',
        patientId: 'p1',
        doctorId: 'd1',
        appointmentDate: '2023-10-10',
        startTime: '10:00',
        endTime: '10:30',
        status: AppointmentStatus.SCHEDULED,
        reasonForVisit: 'Checkup',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AppointmentService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });
        service = TestBed.inject(AppointmentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAppointments', () => {
        it('should build correct query params from filters', () => {
            // filters
            const filters = {
                page: 1,
                limit: 10,
                status: AppointmentStatus.CONFIRMED,
                doctorId: 'd123'
            };

            service.getAppointments(filters).subscribe();

            const req = httpMock.expectOne(req => req.url === `${environment.apiUrl}/appointments`);
            expect(req.request.params.get('page')).toBe('1');
            expect(req.request.params.get('limit')).toBe('10');
            expect(req.request.params.get('status')).toBe(AppointmentStatus.CONFIRMED);
            expect(req.request.params.get('doctorId')).toBe('d123');
            expect(req.request.params.has('startDate')).toBeFalse();

            req.flush({
                success: true,
                data: [mockAppointment],
                metadata: { total: 1, page: 1, limit: 10, totalPages: 1 }
            });
        });

        it('should update signals after fetching', () => {
            service.getAppointments().subscribe();

            const req = httpMock.expectOne(req => req.url === `${environment.apiUrl}/appointments`);
            req.flush({
                success: true,
                data: [mockAppointment],
                metadata: { total: 1, page: 1, limit: 10, totalPages: 1 }
            });

            expect(service.appointments()).toEqual([mockAppointment]);
            expect(service.total()).toBe(1);
        });
    });

    describe('updateAppointment', () => {
        it('should update local signal state on successful update', () => {
            // Pre-load data
            (service as unknown as { appointmentsSignal: { set: (v: Appointment[]) => void } }).appointmentsSignal.set([mockAppointment]);

            const updatedAppt = { ...mockAppointment, status: AppointmentStatus.CONFIRMED };

            service.updateAppointment(mockAppointment.id, { status: AppointmentStatus.CONFIRMED }).subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}`);
            expect(req.request.method).toBe('PUT');
            req.flush({
                success: true,
                data: { appointment: updatedAppt }
            });

            const storedAppts = service.appointments();
            expect(storedAppts[0].status).toBe(AppointmentStatus.CONFIRMED);
        });
    });

    describe('cancelAppointment', () => {
        it('AppointmentService — cancelAppointment — existing — updates appointment in list', () => {
            (service as unknown as { appointmentsSignal: { set: (v: Appointment[]) => void } }).appointmentsSignal.set([mockAppointment]);

            const cancelled = { ...mockAppointment, status: AppointmentStatus.CANCELLED };

            service.cancelAppointment(mockAppointment.id, 'Personal reasons').subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}/cancel`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ cancellationReason: 'Personal reasons' });
            req.flush({ success: true, data: { appointment: cancelled } });

            expect(service.appointments()[0].status).toBe(AppointmentStatus.CANCELLED);
        });

        it('AppointmentService — cancelAppointment — id not in list — list unchanged', () => {
            (service as unknown as { appointmentsSignal: { set: (v: Appointment[]) => void } }).appointmentsSignal.set([mockAppointment]);

            service.cancelAppointment('nonexistent', 'reason').subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/nonexistent/cancel`);
            req.flush({ success: true, data: { appointment: { ...mockAppointment, id: 'nonexistent' } } });

            // Original appointment unchanged
            expect(service.appointments()[0].id).toBe(mockAppointment.id);
        });
    });

    describe('confirmAppointment', () => {
        it('AppointmentService — confirmAppointment — sends POST to confirm endpoint', () => {
            service.confirmAppointment(mockAppointment.id).subscribe((res) => {
                expect(res.data.appointment).toBeDefined();
            });

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}/confirm`);
            expect(req.request.method).toBe('POST');
            req.flush({ success: true, data: { appointment: mockAppointment } });
        });
    });

    describe('completeAppointment', () => {
        it('AppointmentService — completeAppointment — with notes and prescriptions — sends all data', () => {
            const prescriptions = [{ medication: 'Aspirin', dosage: '100mg', frequency: 'daily', duration: '5 days' }];

            service.completeAppointment(mockAppointment.id, 'Good visit', prescriptions as unknown as Prescription[]).subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}/complete`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body.notes).toBe('Good visit');
            expect(req.request.body.prescriptions).toEqual(prescriptions);
            req.flush({ success: true, data: { appointment: mockAppointment } });
        });

        it('AppointmentService — completeAppointment — without optional params — sends undefined values', () => {
            service.completeAppointment(mockAppointment.id).subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}/complete`);
            expect(req.request.body.notes).toBeUndefined();
            expect(req.request.body.prescriptions).toBeUndefined();
            req.flush({ success: true, data: { appointment: mockAppointment } });
        });
    });

    describe('getAppointmentById', () => {
        it('AppointmentService — getAppointmentById — happy path — sets selectedAppointment signal', () => {
            service.getAppointmentById(mockAppointment.id).subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/${mockAppointment.id}`);
            expect(req.request.method).toBe('GET');
            req.flush({ success: true, data: { appointment: mockAppointment } });

            expect(service.selectedAppointment()).toEqual(mockAppointment);
        });
    });

    describe('getAvailableSlots', () => {
        it('AppointmentService — getAvailableSlots — sends doctorId and date as params', () => {
            service.getAvailableSlots('d1', '2025-06-01').subscribe((res) => {
                expect(res.data.slots).toEqual(['09:00', '10:00']);
            });

            const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/appointments/available-slots`);
            expect(req.request.params.get('doctorId')).toBe('d1');
            expect(req.request.params.get('date')).toBe('2025-06-01');
            req.flush({ data: { slots: ['09:00', '10:00'] } });
        });
    });

    describe('createAppointment', () => {
        it('AppointmentService — createAppointment — happy path — prepends to appointments list', () => {
            (service as unknown as { appointmentsSignal: { set: (v: Appointment[]) => void } }).appointmentsSignal.set([mockAppointment]);

            const newAppt = { ...mockAppointment, id: '200' };
            const createData = {
                doctorId: 'd1',
                appointmentDate: '2025-07-01',
                startTime: '09:00',
                reasonForVisit: 'Annual checkup',
            };

            service.createAppointment(createData).subscribe();

            const req = httpMock.expectOne(environment.apiUrl + '/appointments');
            expect(req.request.method).toBe('POST');
            req.flush({ success: true, data: { appointment: newAppt } });

            expect(service.appointments()[0].id).toBe('200');
            expect(service.appointments().length).toBe(2);
        });
    });

    describe('clearSelection', () => {
        it('AppointmentService — clearSelection — clears selectedAppointment signal', () => {
            (service as unknown as { selectedAppointmentSignal: { set: (v: Appointment | null) => void } }).selectedAppointmentSignal.set(mockAppointment);

            service.clearSelection();

            expect(service.selectedAppointment()).toBeNull();
        });
    });

    describe('getDashboardStats', () => {
        it('AppointmentService — getDashboardStats — populates stats signal', () => {
            const stats = { scheduled: 2, confirmed: 1, cancelled: 0, completed: 5, no_show: 0 };

            service.getDashboardStats().subscribe();

            const req = httpMock.expectOne(`${environment.apiUrl}/appointments/dashboard-stats`);
            expect(req.request.method).toBe('GET');
            req.flush({ success: true, data: { stats } });

            expect(service.dashboardStats()).toEqual(stats);
        });
    });

    describe('upcomingAppointments and pastAppointments computed signals', () => {
        it('AppointmentService — upcomingAppointments — filters scheduled and confirmed', () => {
            const appts: Appointment[] = [
                { ...mockAppointment, id: '1', status: AppointmentStatus.SCHEDULED },
                { ...mockAppointment, id: '2', status: AppointmentStatus.CONFIRMED },
                { ...mockAppointment, id: '3', status: AppointmentStatus.COMPLETED },
            ];
            (service as unknown as { appointmentsSignal: { set: (v: Appointment[]) => void } }).appointmentsSignal.set(appts);

            expect(service.upcomingAppointments().length).toBe(2);
        });

        it('AppointmentService — pastAppointments — filters completed and no_show', () => {
            const appts: Appointment[] = [
                { ...mockAppointment, id: '1', status: AppointmentStatus.COMPLETED },
                { ...mockAppointment, id: '2', status: AppointmentStatus.NO_SHOW },
                { ...mockAppointment, id: '3', status: AppointmentStatus.SCHEDULED },
            ];
            (service as unknown as { appointmentsSignal: { set: (v: Appointment[]) => void } }).appointmentsSignal.set(appts);

            expect(service.pastAppointments().length).toBe(2);
        });
    });
});
