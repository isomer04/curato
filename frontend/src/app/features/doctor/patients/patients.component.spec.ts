import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DoctorPatientsComponent } from './patients.component';
import { DoctorService, DoctorPatientsResponse } from '../../../core/services/doctor.service';
import { Gender, Patient } from '../../../core/models';

const makePatient = (id: string, firstName: string, lastName: string): Patient => ({
  id,
  userId: `u-${id}`,
  dateOfBirth: new Date('1990-01-01'),
  gender: Gender.MALE,
  allergies: [],
  user: { firstName, lastName, email: `${firstName.toLowerCase()}@example.com` } as never,
});

const makeResponse = (patients: Patient[]): DoctorPatientsResponse => ({
  data: patients,
  metadata: { total: patients.length, page: 1, limit: 25, totalPages: 1 },
});

describe('DoctorPatientsComponent', () => {
  let component: DoctorPatientsComponent;
  let fixture: ComponentFixture<DoctorPatientsComponent>;
  let mockDoctorService: jasmine.SpyObj<DoctorService>;

  beforeEach(async () => {
    mockDoctorService = jasmine.createSpyObj('DoctorService', ['getDoctorPatients']);
    mockDoctorService.getDoctorPatients.and.returnValue(of(makeResponse([])));

    await TestBed.configureTestingModule({
      imports: [DoctorPatientsComponent],
      providers: [{ provide: DoctorService, useValue: mockDoctorService }],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(DoctorPatientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  // Happy path
  describe('DoctorPatientsComponent — load — happy path', () => {
    it('DoctorPatientsComponent — single page of patients — loads and sets allPatients', fakeAsync(() => {
      mockDoctorService.getDoctorPatients.and.returnValue(
        of(makeResponse([makePatient('p1', 'Alice', 'Smith'), makePatient('p2', 'Bob', 'Jones')])),
      );
      createComponent();
      tick();
      expect(component['allPatients']().length).toBe(2);
      expect(component.isLoading()).toBeFalse();
    }));

    it('DoctorPatientsComponent — empty response — allPatients is empty', fakeAsync(() => {
      mockDoctorService.getDoctorPatients.and.returnValue(of(makeResponse([])));
      createComponent();
      tick();
      expect(component['allPatients']()).toEqual([]);
    }));
  });

  // Error cases
  describe('DoctorPatientsComponent — load — error cases', () => {
    it('DoctorPatientsComponent — HTTP error — sets isLoading to false', fakeAsync(() => {
      mockDoctorService.getDoctorPatients.and.returnValue(
        throwError(() => new Error('Server Error')),
      );
      createComponent();
      tick();
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // Search filtering
  describe('DoctorPatientsComponent — search filtering', () => {
    beforeEach(fakeAsync(() => {
      mockDoctorService.getDoctorPatients.and.returnValue(
        of(makeResponse([makePatient('p1', 'Alice', 'Smith'), makePatient('p2', 'Bob', 'Jones')])),
      );
      createComponent();
      tick();
    }));

    it('DoctorPatientsComponent — empty query — returns all patients', () => {
      component.searchQuery.set('');
      expect(component.filteredPatients().length).toBe(2);
    });

    it('DoctorPatientsComponent — query matching first name — filters correctly', () => {
      component.searchQuery.set('alice');
      expect(component.filteredPatients().length).toBe(1);
      expect(component.filteredPatients()[0].user?.firstName).toBe('Alice');
    });

    it('DoctorPatientsComponent — query matching email — filters correctly', () => {
      component.searchQuery.set('bob@example');
      expect(component.filteredPatients().length).toBe(1);
    });

    it('DoctorPatientsComponent — query matching nothing — returns empty list', () => {
      component.searchQuery.set('zzznomatch');
      expect(component.filteredPatients().length).toBe(0);
    });

    it('DoctorPatientsComponent — query with uppercase — case-insensitive match', () => {
      component.searchQuery.set('ALICE');
      expect(component.filteredPatients().length).toBe(1);
    });
  });

  // initials helper
  describe('DoctorPatientsComponent — initials — edge cases', () => {
    beforeEach(fakeAsync(() => {
      createComponent();
      tick();
    }));

    it('DoctorPatientsComponent — patient with full name — returns uppercased initials', () => {
      const patient = makePatient('p1', 'Alice', 'Smith');
      expect(component['initials'](patient)).toBe('AS');
    });

    it('DoctorPatientsComponent — patient with no user — returns empty string', () => {
      const patient = {
        id: 'p1',
        userId: 'u1',
        dateOfBirth: new Date(),
        gender: Gender.MALE,
        allergies: [],
      } as never;
      expect(component['initials'](patient)).toBe('');
    });
  });
});
