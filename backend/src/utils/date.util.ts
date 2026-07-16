import { DayOfWeek } from '../types/constants';

export const getDayOfWeek = (date: Date): DayOfWeek => {
  const days: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];

  return days[date.getUTCDay()];
};

export const formatDate = (date: Date): string => {
  if (isNaN(date.getTime())) {
    throw new RangeError(`formatDate received an invalid Date: ${String(date)}`);
  }
  return date.toISOString().split('T')[0];
};

export const formatTime = (date: Date): string => {
  // Use UTC to stay consistent with formatDate (toISOString) and getDayOfWeek (getUTCDay).
  // toTimeString() returns local server time and silently offsets stored times when the
  // server's timezone differs from the expected appointment timezone.
  return date.toISOString().split('T')[1].substring(0, 5);
};

export const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const parts = timeStr.split(':');
  if (parts.length < 2) {
    throw new Error(`parseTime: invalid time format "${timeStr}". Expected HH:MM.`);
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`parseTime: non-numeric value in time string "${timeStr}".`);
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`parseTime: out-of-range value in time string "${timeStr}".`);
  }
  return { hours, minutes };
};

export const timeToMinutes = (timeStr: string): number => {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
};

export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(timeStr) + minutesToAdd;
  return minutesToTime(totalMinutes);
};

export const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};

export const doTimesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  return start1Min < end2Min && start2Min < end1Min;
};

export const isDateInPast = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export const isDateInFuture = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const formatDateTime = (date: Date): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
};
