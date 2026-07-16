import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';

import { AdminAppointmentsComponent } from './appointments.component';

const API_URL = `${environment.apiUrl}/appointments`;

const makeAppointment = (id: string, status = 'scheduled') => ({
  id,
  status,
  appointmentDate: '2026-04-10',
  reasonForVisit: 'Check-up',
  patient: { user: { firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com' } },
  doctor: { user: { firstName: 'Dr', lastName: 'Jones' } },
});

describe('AdminAppointmentsComponent', () => {
  let component: AdminAppointmentsComponent;
  let fixture: ComponentFixture<AdminAppointmentsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAppointmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAppointmentsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  function flushLoad(
    appts = [makeAppointment('a1'), makeAppointment('a2')],
    page = 1,
    statusFilter = '',
  ) {
    httpMock = TestBed.inject(HttpTestingController);
    if (statusFilter) component.statusFilter = statusFilter;
    component.currentPage = page;
    fixture.detectChanges(); // triggers ngOnInit → loadAppointments
    const params = new URLSearchParams({
      page: String(page),
      limit: '10',
      ...(statusFilter ? { status: statusFilter } : {}),
    }).toString();
    const req = httpMock.expectOne(`${API_URL}?${params}`);
    req.flush({ data: appts, metadata: { total: appts.length } });
    fixture.detectChanges();
  }

  it('should create', () => {
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock
      .expectOne(`${API_URL}?page=1&limit=10`)
      .flush({ data: [], metadata: { total: 0 } });
    expect(component).toBeTruthy();
  });

  // Happy path
  describe('AdminAppointmentsComponent — initial load — happy path', () => {
    it('AdminAppointmentsComponent — GET succeeds — populates appointments signal', fakeAsync(() => {
      flushLoad();
      tick();
      expect(component.appointments().length).toBe(2);
    }));

    it('AdminAppointmentsComponent — GET succeeds — sets total from metadata', fakeAsync(() => {
      flushLoad();
      tick();
      expect(component.total()).toBe(2);
    }));

    it('AdminAppointmentsComponent — GET succeeds — sets isLoading to false', fakeAsync(() => {
      flushLoad();
      tick();
      expect(component.isLoading()).toBeFalse();
    }));

    it('AdminAppointmentsComponent — GET with status filter — includes status in query', fakeAsync(() => {
      flushLoad([makeAppointment('a1', 'confirmed')], 1, 'confirmed');
      tick();
      expect(component.appointments()[0].status).toBe('confirmed');
    }));
  });

  // Error cases
  describe('AdminAppointmentsComponent — initial load — error cases', () => {
    it('AdminAppointmentsComponent — GET fails — sets errorMessage', fakeAsync(() => {
      httpMock = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      httpMock
        .expectOne(`${API_URL}?page=1&limit=10`)
        .flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
      tick();
      expect(component.errorMessage()).toBe('Failed to load appointments.');
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // Pagination
  describe('AdminAppointmentsComponent — pagination', () => {
    it('AdminAppointmentsComponent — totalPages — calculates correctly from total and pageSize', fakeAsync(() => {
      flushLoad([
        makeAppointment('a1'), makeAppointment('a2'), makeAppointment('a3'),
        makeAppointment('a4'), makeAppointment('a5'), makeAppointment('a6'),
        makeAppointment('a7'), makeAppointment('a8'), makeAppointment('a9'),
        makeAppointment('a10'),
      ]);
      tick();
      component.total.set(25);
      expect(component.totalPages).toBe(3);
    }));

    it('AdminAppointmentsComponent — nextPage — increments currentPage and reloads', fakeAsync(() => {
      flushLoad();
      tick();
      component.total.set(20);

      component.nextPage();
      const req = httpMock.expectOne(`${API_URL}?page=2&limit=10`);
      req.flush({ data: [], metadata: { total: 20 } });
      tick();

      expect(component.currentPage).toBe(2);
    }));

    it('AdminAppointmentsComponent — nextPage on last page — does not fetch', fakeAsync(() => {
      flushLoad();
      tick();
      component.total.set(5);

      component.nextPage();
      httpMock.expectNone(`${API_URL}?page=2&limit=10`);
    }));

    it('AdminAppointmentsComponent — prevPage on first page — does not fetch', fakeAsync(() => {
      flushLoad();
      tick();
      expect(component.currentPage).toBe(1);

      component.prevPage();
      httpMock.expectNone(`${API_URL}?page=0&limit=10`);
    }));

    it('AdminAppointmentsComponent — prevPage from page 2 — decrements page and reloads', fakeAsync(() => {
      flushLoad([], 2);
      tick();
      component.total.set(15);

      component.prevPage();
      const req = httpMock.expectOne(`${API_URL}?page=1&limit=10`);
      req.flush({ data: [], metadata: { total: 15 } });
      tick();

      expect(component.currentPage).toBe(1);
    }));
  });

  // statusClass helper
  describe('AdminAppointmentsComponent — statusClass — edge cases', () => {
    beforeEach(() => {
      httpMock = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      httpMock.expectOne(`${API_URL}?page=1&limit=10`).flush({ data: [], metadata: { total: 0 } });
    });

    it('AdminAppointmentsComponent — statusClass scheduled — returns warning classes', () => {
      expect(component.statusClass('scheduled')).toContain('warning');
    });

    it('AdminAppointmentsComponent — statusClass completed — returns success classes', () => {
      expect(component.statusClass('completed')).toContain('success');
    });

    it('AdminAppointmentsComponent — statusClass unknown — returns light text-muted', () => {
      expect(component.statusClass('unknown')).toBe('bg-light text-muted');
    });
  });

  // Filter change
  describe('AdminAppointmentsComponent — onFilterChange — resets to page 1', () => {
    it('AdminAppointmentsComponent — filter change — resets currentPage to 1', fakeAsync(() => {
      flushLoad();
      tick();
      component.currentPage = 3;
      component.statusFilter = 'cancelled';

      component.onFilterChange();
      const req = httpMock.expectOne(`${API_URL}?page=1&limit=10&status=cancelled`);
      req.flush({ data: [], metadata: { total: 0 } });
      tick();

      expect(component.currentPage).toBe(1);
    }));
  });
});
