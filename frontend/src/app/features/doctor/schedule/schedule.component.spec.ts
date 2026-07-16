import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ScheduleComponent } from './schedule.component';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DayOfWeek } from '../../../core/models';
import { of, throwError } from 'rxjs';

const emptyAvailabilityResponse = {
    success: true,
    data: { availability: [] },
    message: 'OK',
};

const availabilityResponse = {
    success: true,
    data: {
        availability: [
            {
                id: 'av-1',
                doctorId: 'dr-1',
                effectiveFrom: '2025-01-01',
                dayOfWeek: DayOfWeek.MONDAY,
                isActive: false,
                startTime: '10:00',
                endTime: '18:00',
                slotDuration: 45,
            },
        ],
    },
    message: 'OK',
};

const updateScheduleResponse = {
    success: true,
    data: { availabilities: [] },
    message: 'Saved',
};

describe('ScheduleComponent', () => {
    let component: ScheduleComponent;
    let fixture: ComponentFixture<ScheduleComponent>;
    let mockDoctorService: jasmine.SpyObj<DoctorService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    beforeEach(async () => {
        mockDoctorService = jasmine.createSpyObj('DoctorService', ['getAvailability', 'updateSchedule']);
        mockDoctorService.getAvailability.and.returnValue(of(emptyAvailabilityResponse));
        mockDoctorService.updateSchedule.and.returnValue(of(updateScheduleResponse));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info']);

        await TestBed.configureTestingModule({
            imports: [ScheduleComponent],
            providers: [
                { provide: DoctorService, useValue: mockDoctorService },
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ScheduleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ScheduleComponent — ngOnInit — calls loadSchedule', () => {
        expect(mockDoctorService.getAvailability).toHaveBeenCalled();
    });

    it('ScheduleComponent — loadSchedule — maps availability to schedule', () => {
        mockDoctorService.getAvailability.and.returnValue(of(availabilityResponse));
        component['loadSchedule']();
        const schedule = component['schedule']();
        expect(schedule[DayOfWeek.MONDAY].isActive).toBe(false);
        expect(schedule[DayOfWeek.MONDAY].startTime).toBe('10:00');
        expect(schedule[DayOfWeek.MONDAY].endTime).toBe('18:00');
        expect(schedule[DayOfWeek.MONDAY].slotDuration).toBe(45);
    });

    describe('saveSchedule', () => {
        it('ScheduleComponent — saveSchedule — success — shows success notification', fakeAsync(() => {
            component['saveSchedule']();
            tick();
            expect(mockNotificationService.success).toHaveBeenCalledWith('Success', 'Schedule saved successfully');
            expect(component['isSaving']()).toBe(false);
        }));

        it('ScheduleComponent — saveSchedule — error — shows error notification', fakeAsync(() => {
            mockDoctorService.updateSchedule.and.returnValue(throwError(() => new Error('Network')));
            component['saveSchedule']();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to save schedule');
            expect(component['isSaving']()).toBe(false);
        }));

        it('ScheduleComponent — saveSchedule — sets isSaving true while saving', () => {
            let capturedSavingState = false;
            mockDoctorService.updateSchedule.and.callFake(() => {
                capturedSavingState = component['isSaving']();
                return of(updateScheduleResponse);
            });
            component['saveSchedule']();
            expect(capturedSavingState).toBe(true);
        });

        it('ScheduleComponent — saveSchedule — only sends active days', fakeAsync(() => {
            const schedule = component['schedule']();
            schedule[DayOfWeek.SATURDAY].isActive = false;
            schedule[DayOfWeek.SUNDAY].isActive = false;
            component['schedule'].set({ ...schedule });
            component['saveSchedule']();
            tick();
            const callArgs = mockDoctorService.updateSchedule.calls.mostRecent().args;
            const scheduleData = callArgs[0] as { dayOfWeek: DayOfWeek }[];
            expect(scheduleData.some(d => d.dayOfWeek === DayOfWeek.SATURDAY)).toBe(false);
            expect(scheduleData.some(d => d.dayOfWeek === DayOfWeek.SUNDAY)).toBe(false);
        }));
    });

    describe('timeOff management', () => {
        it('ScheduleComponent — addTimeOff — opens modal and resets entry', () => {
            component['newTimeOff'].set({ startDate: '2025-01-01', endDate: '2025-01-05', reason: 'Vacation' });
            component['addTimeOff']();
            expect(component['showTimeOffModal']()).toBe(true);
            expect(component['newTimeOff']().startDate).toBe('');
            expect(component['newTimeOff']().reason).toBe('');
        });

        it('ScheduleComponent — confirmAddTimeOff — valid entry — adds to list and closes modal', () => {
            component['showTimeOffModal'].set(true);
            component['newTimeOff'].set({ startDate: '2025-01-01', endDate: '2025-01-05', reason: 'Vacation' });
            component['confirmAddTimeOff']();
            expect(component['timeOffList']().length).toBe(1);
            expect(component['timeOffList']()[0].reason).toBe('Vacation');
            expect(component['showTimeOffModal']()).toBe(false);
        });

        it('ScheduleComponent — confirmAddTimeOff — missing startDate — does not add', () => {
            component['newTimeOff'].set({ startDate: '', endDate: '2025-01-05', reason: 'Vacation' });
            component['confirmAddTimeOff']();
            expect(component['timeOffList']().length).toBe(0);
        });

        it('ScheduleComponent — confirmAddTimeOff — missing endDate — does not add', () => {
            component['newTimeOff'].set({ startDate: '2025-01-01', endDate: '', reason: 'Vacation' });
            component['confirmAddTimeOff']();
            expect(component['timeOffList']().length).toBe(0);
        });

        it('ScheduleComponent — removeTimeOff — removes entry by index', () => {
            component['timeOffList'].set([
                { startDate: '2025-01-01', endDate: '2025-01-05', reason: 'Vacation' },
                { startDate: '2025-02-01', endDate: '2025-02-05', reason: 'Conference' },
            ]);
            component['removeTimeOff'](0);
            expect(component['timeOffList']().length).toBe(1);
            expect(component['timeOffList']()[0].reason).toBe('Conference');
        });
    });

    describe('applyTemplate', () => {
        it('ScheduleComponent — applyTemplate weekdays — activates Mon–Fri only', () => {
            component['applyTemplate']('weekdays');
            const schedule = component['schedule']();
            expect(schedule[DayOfWeek.MONDAY].isActive).toBe(true);
            expect(schedule[DayOfWeek.FRIDAY].isActive).toBe(true);
            expect(schedule[DayOfWeek.SATURDAY].isActive).toBe(false);
            expect(schedule[DayOfWeek.SUNDAY].isActive).toBe(false);
            expect(schedule[DayOfWeek.MONDAY].startTime).toBe('09:00');
            expect(schedule[DayOfWeek.MONDAY].endTime).toBe('17:00');
        });

        it('ScheduleComponent — applyTemplate morning — sets 06:00–12:00', () => {
            component['applyTemplate']('morning');
            const schedule = component['schedule']();
            expect(schedule[DayOfWeek.MONDAY].startTime).toBe('06:00');
            expect(schedule[DayOfWeek.MONDAY].endTime).toBe('12:00');
            expect(schedule[DayOfWeek.SATURDAY].isActive).toBe(true);
            expect(schedule[DayOfWeek.SUNDAY].isActive).toBe(false);
        });

        it('ScheduleComponent — applyTemplate evening — sets 16:00–21:00', () => {
            component['applyTemplate']('evening');
            const schedule = component['schedule']();
            expect(schedule[DayOfWeek.MONDAY].startTime).toBe('16:00');
            expect(schedule[DayOfWeek.MONDAY].endTime).toBe('21:00');
            expect(schedule[DayOfWeek.SATURDAY].isActive).toBe(false);
            expect(schedule[DayOfWeek.SUNDAY].isActive).toBe(false);
        });
    });
});
