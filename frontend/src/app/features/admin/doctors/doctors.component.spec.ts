import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';

import { AdminDoctorsComponent } from './doctors.component';

const ADMIN_URL = `${environment.apiUrl}/admin`;

const makePendingDoctor = (id: string, overrides = {}) => ({
  id,
  specialization: 'Cardiology',
  licenseNumber: 'LIC-001',
  isApproved: false,
  user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  ...overrides,
});

describe('AdminDoctorsComponent', () => {
  let component: AdminDoctorsComponent;
  let fixture: ComponentFixture<AdminDoctorsComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDoctorsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDoctorsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => httpMock.verify());

  function flushPending(doctors = [makePendingDoctor('d1'), makePendingDoctor('d2')]) {
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit → loadPendingDoctors
    const req = httpMock.expectOne(`${ADMIN_URL}/doctors/pending`);
    req.flush({ data: doctors, metadata: { total: doctors.length } });
    fixture.detectChanges();
  }

  it('should create', () => {
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${ADMIN_URL}/doctors/pending`).flush({ data: [], metadata: { total: 0 } });
    expect(component).toBeTruthy();
  });

  // Happy path
  describe('AdminDoctorsComponent — initial load — happy path', () => {
    it('AdminDoctorsComponent — GET succeeds — populates pendingDoctors signal', fakeAsync(() => {
      flushPending();
      tick();
      expect(component.pendingDoctors().length).toBe(2);
    }));

    it('AdminDoctorsComponent — GET succeeds — sets total from metadata', fakeAsync(() => {
      flushPending();
      tick();
      expect(component.total()).toBe(2);
    }));

    it('AdminDoctorsComponent — GET succeeds — sets isLoading to false', fakeAsync(() => {
      flushPending();
      tick();
      expect(component.isLoading()).toBeFalse();
    }));

    it('AdminDoctorsComponent — GET returns empty list — pendingDoctors is empty', fakeAsync(() => {
      flushPending([]);
      tick();
      expect(component.pendingDoctors()).toEqual([]);
      expect(component.total()).toBe(0);
    }));
  });

  // Error cases — load
  describe('AdminDoctorsComponent — initial load — error cases', () => {
    it('AdminDoctorsComponent — GET fails — sets errorMessage', fakeAsync(() => {
      httpMock = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      httpMock.expectOne(`${ADMIN_URL}/doctors/pending`).flush('Error', {
        status: 500,
        statusText: 'Server Error',
      });
      tick();
      expect(component.errorMessage()).toBe('Failed to load pending doctors.');
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // Approve — happy path
  describe('AdminDoctorsComponent — approve — happy path', () => {
    it('AdminDoctorsComponent — approve called — sends PATCH to correct URL', fakeAsync(() => {
      flushPending();
      tick();

      component.approve('d1');

      httpMock.expectOne(`${ADMIN_URL}/doctors/d1/approve`).flush({});
      // reload triggered
      httpMock.expectOne(`${ADMIN_URL}/doctors/pending`).flush({ data: [], metadata: { total: 0 } });
      tick();

      expect(component.actionInProgress()).toBeNull();
    }));

    it('AdminDoctorsComponent — approve succeeds — reloads the doctors list', fakeAsync(() => {
      flushPending();
      tick();

      component.approve('d1');
      httpMock.expectOne(`${ADMIN_URL}/doctors/d1/approve`).flush({});
      httpMock
        .expectOne(`${ADMIN_URL}/doctors/pending`)
        .flush({ data: [makePendingDoctor('d2')], metadata: { total: 1 } });
      tick();

      expect(component.pendingDoctors().length).toBe(1);
    }));
  });

  // Approve — error cases
  describe('AdminDoctorsComponent — approve — error cases', () => {
    it('AdminDoctorsComponent — approve fails — sets errorMessage and clears actionInProgress', fakeAsync(() => {
      flushPending();
      tick();

      component.approve('d1');
      httpMock.expectOne(`${ADMIN_URL}/doctors/d1/approve`).flush('Error', { status: 500, statusText: 'Error' });
      tick();

      expect(component.errorMessage()).toBe('Failed to approve doctor.');
      expect(component.actionInProgress()).toBeNull();
    }));
  });

  // Reject — happy path
  describe('AdminDoctorsComponent — reject — happy path', () => {
    it('AdminDoctorsComponent — reject called — sends PATCH to correct URL', fakeAsync(() => {
      flushPending();
      tick();

      component.reject('d1');
      httpMock.expectOne(`${ADMIN_URL}/doctors/d1/reject`).flush({});
      httpMock.expectOne(`${ADMIN_URL}/doctors/pending`).flush({ data: [], metadata: { total: 0 } });
      tick();

      expect(component.actionInProgress()).toBeNull();
    }));
  });

  // Reject — error cases
  describe('AdminDoctorsComponent — reject — error cases', () => {
    it('AdminDoctorsComponent — reject fails — sets errorMessage', fakeAsync(() => {
      flushPending();
      tick();

      component.reject('d2');
      httpMock.expectOne(`${ADMIN_URL}/doctors/d2/reject`).flush('Error', { status: 500, statusText: 'Error' });
      tick();

      expect(component.errorMessage()).toBe('Failed to reject doctor.');
    }));
  });

  // Edge cases
  describe('AdminDoctorsComponent — edge cases', () => {
    it('AdminDoctorsComponent — metadata missing total — falls back to data.length', fakeAsync(() => {
      httpMock = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      httpMock
        .expectOne(`${ADMIN_URL}/doctors/pending`)
        .flush({ data: [makePendingDoctor('d1'), makePendingDoctor('d2')], metadata: {} });
      tick();
      expect(component.total()).toBe(2);
    }));

    it('AdminDoctorsComponent — actionInProgress set while awaiting response', fakeAsync(() => {
      flushPending();
      tick();

      component.approve('d1');
      expect(component.actionInProgress()).toBe('d1');

      httpMock.expectOne(`${ADMIN_URL}/doctors/d1/approve`).flush({});
      httpMock.expectOne(`${ADMIN_URL}/doctors/pending`).flush({ data: [], metadata: { total: 0 } });
      tick();
    }));
  });
});
