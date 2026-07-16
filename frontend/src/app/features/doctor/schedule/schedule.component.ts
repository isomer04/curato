import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DayOfWeek } from '../../../core/models';

interface ScheduleDay {
  isActive: boolean;
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakStart?: string;
  breakEnd?: string;
}

interface TimeOffEntry {
  startDate: string;
  endDate: string;
  reason: string;
}

@Component({
  selector: 'app-schedule',
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleComponent implements OnInit {
  private readonly doctorService = inject(DoctorService);
  private readonly notificationService = inject(NotificationService);

  protected readonly isSaving = signal(false);
  protected readonly showTimeOffModal = signal(false);
  protected readonly timeOffList = signal<TimeOffEntry[]>([]);

  protected readonly daysOfWeek: readonly DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ] as const;

  protected readonly schedule = signal<Record<DayOfWeek, ScheduleDay>>({
    [DayOfWeek.MONDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.TUESDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.WEDNESDAY]: {
      isActive: true,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
    },
    [DayOfWeek.THURSDAY]: {
      isActive: true,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
    },
    [DayOfWeek.FRIDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.SATURDAY]: {
      isActive: false,
      startTime: '09:00',
      endTime: '13:00',
      slotDuration: 30,
    },
    [DayOfWeek.SUNDAY]: { isActive: false, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
  });

  protected readonly newTimeOff = signal<TimeOffEntry>({ startDate: '', endDate: '', reason: '' });

  ngOnInit(): void {
    this.loadSchedule();
  }

  protected loadSchedule(): void {
    this.doctorService.getAvailability().subscribe({
      next: (response) => {
        this.schedule.update((current) => {
          const updated = { ...current };
          response.data.availability?.forEach((avail) => {
            const day = avail.dayOfWeek as DayOfWeek;
            if (updated[day]) {
              updated[day] = {
                ...updated[day],
                isActive: avail.isActive,
                startTime: avail.startTime,
                endTime: avail.endTime,
                slotDuration: avail.slotDuration,
              };
            }
          });
          return updated;
        });
      },
    });
  }

  protected saveSchedule(): void {
    this.isSaving.set(true);

    const scheduleSnapshot = this.schedule();
    const scheduleData = this.daysOfWeek
      .filter((day) => scheduleSnapshot[day].isActive)
      .map((day) => ({
        dayOfWeek: day,
        startTime: scheduleSnapshot[day].startTime,
        endTime: scheduleSnapshot[day].endTime,
        slotDuration: scheduleSnapshot[day].slotDuration,
      }));

    this.doctorService
      .updateSchedule(scheduleData, new Date().toISOString().split('T')[0])
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success('Success', 'Schedule saved successfully');
        },
        error: () => {
          this.isSaving.set(false);
          this.notificationService.error('Error', 'Failed to save schedule');
        },
      });
  }

  protected addTimeOff(): void {
    this.newTimeOff.set({ startDate: '', endDate: '', reason: '' });
    this.showTimeOffModal.set(true);
  }

  protected confirmAddTimeOff(): void {
    const entry = this.newTimeOff();
    if (entry.startDate && entry.endDate) {
      this.timeOffList.update((list) => [...list, { ...entry }]);
      this.showTimeOffModal.set(false);
    }
  }

  protected removeTimeOff(index: number): void {
    this.timeOffList.update((list) => list.filter((_, i) => i !== index));
  }

  protected applyTemplate(template: 'weekdays' | 'morning' | 'evening'): void {
    const templates: Record<
      string,
      { activeDays: DayOfWeek[]; startTime: string; endTime: string }
    > = {
      weekdays: {
        activeDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        startTime: '09:00',
        endTime: '17:00',
      },
      morning: {
        activeDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
        ],
        startTime: '06:00',
        endTime: '12:00',
      },
      evening: {
        activeDays: [
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ],
        startTime: '16:00',
        endTime: '21:00',
      },
    };

    const config = templates[template];
    this.schedule.update((current) => {
      const updated = { ...current };
      this.daysOfWeek.forEach((day) => {
        updated[day] = {
          ...updated[day],
          isActive: config.activeDays.includes(day),
          startTime: config.startTime,
          endTime: config.endTime,
        };
      });
      return updated;
    });

    this.notificationService.info(
      'Template Applied',
      `${template} schedule applied. Don't forget to save!`,
    );
  }
}
