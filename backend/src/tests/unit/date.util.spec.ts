import {
  getDayOfWeek,
  formatDate,
  formatTime,
  parseTime,
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  isTimeInRange,
  doTimesOverlap,
  isDateInPast,
  isDateInFuture,
  addDays,
  getDateRange,
  formatDateTime,
  calculateAge,
} from '../../utils/date.util';
import { DayOfWeek } from '../../types/constants';

describe('date.util', () => {

  describe('getDayOfWeek', () => {
    // Use UTC dates so tests are timezone-independent
    it('returns SUNDAY for UTC Sunday', () => {
      expect(getDayOfWeek(new Date('2024-01-07T00:00:00Z'))).toBe(DayOfWeek.SUNDAY);
    });
    it('returns MONDAY for UTC Monday', () => {
      expect(getDayOfWeek(new Date('2024-01-08T00:00:00Z'))).toBe(DayOfWeek.MONDAY);
    });
    it('returns SATURDAY for UTC Saturday', () => {
      expect(getDayOfWeek(new Date('2024-01-13T00:00:00Z'))).toBe(DayOfWeek.SATURDAY);
    });
  });


  describe('formatDate', () => {
    it('returns ISO date part', () => {
      expect(formatDate(new Date('2024-03-15T12:30:00Z'))).toBe('2024-03-15');
    });
    it('throws RangeError for invalid Date', () => {
      expect(() => formatDate(new Date('not-a-date'))).toThrow(RangeError);
    });
  });


  describe('formatTime', () => {
    it('returns HH:MM from a Date', () => {
      // Use a local time and rely on the function's toTimeString()
      const d = new Date();
      d.setHours(9, 30, 0, 0);
      const result = formatTime(d);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });


  describe('parseTime', () => {
    it('parses "09:30" correctly', () => {
      expect(parseTime('09:30')).toEqual({ hours: 9, minutes: 30 });
    });
    it('parses "00:00"', () => {
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
    });
    it('parses "23:59"', () => {
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
    });
    it('throws for missing colon separator', () => {
      expect(() => parseTime('930')).toThrow();
    });
    it('throws for non-numeric parts', () => {
      expect(() => parseTime('ab:cd')).toThrow();
    });
    it('throws for out-of-range hours', () => {
      expect(() => parseTime('24:00')).toThrow();
    });
    it('throws for out-of-range minutes', () => {
      expect(() => parseTime('09:60')).toThrow();
    });
    it('throws for negative values', () => {
      expect(() => parseTime('-1:00')).toThrow();
    });
  });


  describe('timeToMinutes', () => {
    it('converts "09:30" to 570 minutes', () => {
      expect(timeToMinutes('09:30')).toBe(570);
    });
    it('converts "00:00" to 0', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });
    it('converts "23:59" to 1439', () => {
      expect(timeToMinutes('23:59')).toBe(1439);
    });
  });


  describe('minutesToTime', () => {
    it('converts 570 to "09:30"', () => {
      expect(minutesToTime(570)).toBe('09:30');
    });
    it('converts 0 to "00:00"', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });
    it('converts 1439 to "23:59"', () => {
      expect(minutesToTime(1439)).toBe('23:59');
    });
    it('pads hours and minutes with leading zero', () => {
      expect(minutesToTime(65)).toBe('01:05');
    });
  });


  describe('addMinutesToTime', () => {
    it('adds 30 minutes to "09:00" → "09:30"', () => {
      expect(addMinutesToTime('09:00', 30)).toBe('09:30');
    });
    it('handles crossing an hour boundary', () => {
      expect(addMinutesToTime('09:45', 30)).toBe('10:15');
    });
  });


  describe('isTimeInRange', () => {
    it('returns true when time is inside range', () => {
      expect(isTimeInRange('10:00', '09:00', '17:00')).toBe(true);
    });
    it('returns true at start boundary (inclusive)', () => {
      expect(isTimeInRange('09:00', '09:00', '17:00')).toBe(true);
    });
    it('returns false at end boundary (exclusive)', () => {
      expect(isTimeInRange('17:00', '09:00', '17:00')).toBe(false);
    });
    it('returns false before start', () => {
      expect(isTimeInRange('08:59', '09:00', '17:00')).toBe(false);
    });
    it('returns false after end', () => {
      expect(isTimeInRange('17:01', '09:00', '17:00')).toBe(false);
    });
  });


  describe('doTimesOverlap', () => {
    it('returns true for overlapping slots', () => {
      expect(doTimesOverlap('09:00', '11:00', '10:00', '12:00')).toBe(true);
    });
    it('returns false for adjacent non-overlapping slots', () => {
      expect(doTimesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
    });
    it('returns false for completely separate slots', () => {
      expect(doTimesOverlap('09:00', '10:00', '11:00', '12:00')).toBe(false);
    });
    it('returns true when one slot contains another', () => {
      expect(doTimesOverlap('09:00', '17:00', '10:00', '11:00')).toBe(true);
    });
  });


  describe('isDateInPast', () => {
    it('returns true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isDateInPast(yesterday)).toBe(true);
    });
    it('returns false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isDateInPast(tomorrow)).toBe(false);
    });
    it('returns false for today (not past)', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(isDateInPast(today)).toBe(false);
    });
  });


  describe('isDateInFuture', () => {
    it('returns true for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isDateInFuture(tomorrow)).toBe(true);
    });
    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isDateInFuture(yesterday)).toBe(false);
    });
    it('returns false for today (not future)', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(isDateInFuture(today)).toBe(false);
    });
  });


  describe('addDays', () => {
    it('adds positive days', () => {
      const base = new Date('2024-01-01');
      expect(addDays(base, 5).toISOString().split('T')[0]).toBe('2024-01-06');
    });
    it('subtracts days when negative', () => {
      const base = new Date('2024-01-10');
      expect(addDays(base, -3).toISOString().split('T')[0]).toBe('2024-01-07');
    });
    it('does not mutate the original date', () => {
      const base = new Date('2024-01-01');
      addDays(base, 10);
      expect(base.toISOString().split('T')[0]).toBe('2024-01-01');
    });
  });


  describe('getDateRange', () => {
    it('returns all dates in an inclusive range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-03');
      const range = getDateRange(start, end);
      expect(range).toHaveLength(3);
      expect(range[0].toISOString().split('T')[0]).toBe('2024-01-01');
      expect(range[2].toISOString().split('T')[0]).toBe('2024-01-03');
    });

    it('returns a single date for same start and end', () => {
      const date = new Date('2024-06-15');
      expect(getDateRange(date, date)).toHaveLength(1);
    });

    it('returns empty array when start is after end', () => {
      const start = new Date('2024-01-10');
      const end = new Date('2024-01-05');
      expect(getDateRange(start, end)).toHaveLength(0);
    });
  });


  describe('formatDateTime', () => {
    it('returns "YYYY-MM-DD HH:MM" format', () => {
      const result = formatDateTime(new Date('2024-03-15T09:05:00Z'));
      // Result format: "2024-03-15 HH:MM" — the time component is local
      expect(result).toMatch(/^2024-03-15 \d{2}:\d{2}$/);
    });
  });


  describe('calculateAge', () => {
    it('computes age correctly', () => {
      // In tests running on March 15, 2026, someone born March 15, 1990 is 36
      const dob = new Date('1990-03-15');
      const age = calculateAge(dob);
      expect(age).toBeGreaterThanOrEqual(35);
    });

    it('does not count birthday until the day of', () => {
      const today = new Date();
      // Birthday tomorrow
      const dob = new Date(today);
      dob.setFullYear(dob.getFullYear() - 10);
      dob.setDate(dob.getDate() + 1);
      const age = calculateAge(dob);
      expect(age).toBe(9);
    });

    it('handles future month causing age decrement', () => {
      const today = new Date();
      // Born in a month after today's month this year
      const dob = new Date(today.getFullYear() - 20, today.getMonth() + 1, 1);
      const age = calculateAge(dob);
      expect(age).toBe(19);
    });
  });
});
