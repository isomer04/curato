import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DoctorService } from './doctor.service';
import { DayOfWeek } from '../models';
import { environment } from '../../../environments/environment';

describe('DoctorService', () => {
  let service: DoctorService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/doctors`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DoctorService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DoctorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAvailability', () => {
    it('DoctorService — getAvailability — happy path — sends GET to availability endpoint', () => {
      service.getAvailability().subscribe((res) => {
        expect(res.data.availability).toEqual([]);
      });

      const req = httpMock.expectOne(`${apiUrl}/availability`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { availability: [] } });
    });
  });

  describe('updateSchedule', () => {
    it('DoctorService — updateSchedule — happy path — sends schedule data in POST body', () => {
      const scheduleData = [
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
      ];
      const effectiveFrom = '2025-01-01';

      service.updateSchedule(scheduleData, effectiveFrom).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/schedule`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.schedule).toEqual(scheduleData);
      expect(req.request.body.effectiveFrom).toBe(effectiveFrom);
      req.flush({ success: true, data: { availabilities: [] } });
    });
  });

  describe('getDoctors', () => {
    it('DoctorService — getDoctors — happy path — returns doctors list', () => {
      service.getDoctors().subscribe((res) => {
        expect(res.data).toBeDefined();
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: [],
        metadata: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });
  });

  describe('getDoctorPatients', () => {
    it('DoctorService — getDoctorPatients — default params — sends page=1 limit=25', () => {
      service.getDoctorPatients().subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/patients`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('25');
      req.flush({ data: [], metadata: { total: 0, page: 1, limit: 25, totalPages: 0 } });
    });

    it('DoctorService — getDoctorPatients — custom params — sends correct page and limit', () => {
      service.getDoctorPatients(3, 10).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/patients`);
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ data: [], metadata: { total: 0, page: 3, limit: 10, totalPages: 0 } });
    });
  });
});
