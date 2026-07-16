import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MedicalRecordsComponent } from './medical-records.component';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { MedicalRecordType } from '../../../core/models';

const makeRecord = (id: string, recordType: MedicalRecordType) => ({
  id,
  patientId: 'p1',
  doctorId: 'd1',
  recordType,
  isConfidential: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('MedicalRecordsComponent', () => {
  let component: MedicalRecordsComponent;
  let fixture: ComponentFixture<MedicalRecordsComponent>;
  let mockMedicalRecordService: jasmine.SpyObj<MedicalRecordService>;

  beforeEach(async () => {
    mockMedicalRecordService = jasmine.createSpyObj('MedicalRecordService', [
      'getMyRecords',
      'downloadMyRecordsCsv',
      'downloadMyRecordsPdf',
    ]);

    await TestBed.configureTestingModule({
      imports: [MedicalRecordsComponent],
      providers: [{ provide: MedicalRecordService, useValue: mockMedicalRecordService }],
    }).compileComponents();
  });

  function buildWith(
    response: ReturnType<typeof mockMedicalRecordService.getMyRecords> = of({
      success: true,
      data: [],
    }),
  ) {
    mockMedicalRecordService.getMyRecords.and.returnValue(response);
    fixture = TestBed.createComponent(MedicalRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    buildWith();
    expect(component).toBeTruthy();
  });

  // Happy path
  describe('MedicalRecordsComponent — fetch — happy path', () => {
    it('MedicalRecordsComponent — service returns records — populates records signal', fakeAsync(() => {
      const records = [
        makeRecord('r1', MedicalRecordType.CONSULTATION),
        makeRecord('r2', MedicalRecordType.LAB_RESULT),
      ];
      buildWith(of({ success: true, data: records }));
      tick();
      expect(component.records().length).toBe(2);
    }));

    it('MedicalRecordsComponent — service returns records — sets isLoading to false', fakeAsync(() => {
      buildWith(of({ success: true, data: [] }));
      tick();
      expect(component.isLoading()).toBeFalse();
    }));

    it('MedicalRecordsComponent — service returns empty list — records signal is empty', fakeAsync(() => {
      buildWith(of({ success: true, data: [] }));
      tick();
      expect(component.records()).toEqual([]);
      expect(component.error()).toBeNull();
    }));
  });

  // Error cases
  describe('MedicalRecordsComponent — fetch — error cases', () => {
    it('MedicalRecordsComponent — service throws — sets error signal', fakeAsync(() => {
      buildWith(throwError(() => ({ message: 'Network error' })));
      tick();
      expect(component.error()).toBe('Network error');
      expect(component.isLoading()).toBeFalse();
    }));

    it('MedicalRecordsComponent — service throws without message — falls back to generic message', fakeAsync(() => {
      buildWith(throwError(() => ({})));
      tick();
      expect(component.error()).toBe('Failed to load medical records');
    }));

    it('MedicalRecordsComponent — success:false response — sets error message', fakeAsync(() => {
      buildWith(of({ success: false, data: [] }));
      tick();
      expect(component.error()).toBe('Failed to load medical records');
    }));
  });

  // Download proxies
  describe('MedicalRecordsComponent — downloads', () => {
    beforeEach(() => buildWith());

    it('MedicalRecordsComponent — downloadCsv — delegates to service', () => {
      component.downloadCsv();
      expect(mockMedicalRecordService.downloadMyRecordsCsv).toHaveBeenCalled();
    });

    it('MedicalRecordsComponent — downloadPdf — delegates to service', () => {
      component.downloadPdf();
      expect(mockMedicalRecordService.downloadMyRecordsPdf).toHaveBeenCalled();
    });
  });

  // getRecordTypeIcon
  describe('MedicalRecordsComponent — getRecordTypeIcon — happy path', () => {
    beforeEach(() => buildWith());

    it('MedicalRecordsComponent — CONSULTATION — returns primary icon', () => {
      expect(component.getRecordTypeIcon(MedicalRecordType.CONSULTATION)).toContain('text-primary');
    });

    it('MedicalRecordsComponent — LAB_RESULT — returns danger icon', () => {
      expect(component.getRecordTypeIcon(MedicalRecordType.LAB_RESULT)).toContain('text-danger');
    });

    it('MedicalRecordsComponent — PRESCRIPTION — returns success icon', () => {
      expect(component.getRecordTypeIcon(MedicalRecordType.PRESCRIPTION)).toContain('text-success');
    });

    it('MedicalRecordsComponent — SURGERY — returns warning icon', () => {
      expect(component.getRecordTypeIcon(MedicalRecordType.SURGERY)).toContain('text-warning');
    });

    it('MedicalRecordsComponent — VACCINATION — returns info icon', () => {
      expect(component.getRecordTypeIcon(MedicalRecordType.VACCINATION)).toContain('text-info');
    });

    it('MedicalRecordsComponent — OTHER — returns secondary icon', () => {
      expect(component.getRecordTypeIcon(MedicalRecordType.OTHER)).toContain('text-secondary');
    });
  });

  // getRecordTypeBadge
  describe('MedicalRecordsComponent — getRecordTypeBadge — happy path', () => {
    beforeEach(() => buildWith());

    it('MedicalRecordsComponent — CONSULTATION — returns primary badge', () => {
      expect(component.getRecordTypeBadge(MedicalRecordType.CONSULTATION)).toContain('text-primary');
    });

    it('MedicalRecordsComponent — LAB_RESULT — returns danger badge', () => {
      expect(component.getRecordTypeBadge(MedicalRecordType.LAB_RESULT)).toContain('text-danger');
    });

    it('MedicalRecordsComponent — OTHER — returns secondary badge', () => {
      expect(component.getRecordTypeBadge(MedicalRecordType.OTHER)).toContain('text-secondary');
    });
  });

  // Edge cases
  describe('MedicalRecordsComponent — fetchRecords re-invocation — edge cases', () => {
    it('MedicalRecordsComponent — fetchRecords called twice — resets error before second fetch', fakeAsync(() => {
      mockMedicalRecordService.getMyRecords.and.returnValue(throwError(() => ({ message: 'err' })));
      buildWith(throwError(() => ({ message: 'err' })));
      tick();
      expect(component.error()).toBeTruthy();

      mockMedicalRecordService.getMyRecords.and.returnValue(
        of({ success: true, data: [] }),
      );
      component.fetchRecords();
      tick();
      expect(component.error()).toBeNull();
    }));
  });
});
