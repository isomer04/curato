import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MedicalRecordService } from './medical-record.service';
import { environment } from '../../../environments/environment';

import { MedicalRecordType } from '../models/medical-record.model';

describe('MedicalRecordService', () => {
  let service: MedicalRecordService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/medical-records`;

  const mockRecord = {
    id: 'rec-1',
    patientId: 'pt-1',
    doctorId: 'dr-1',
    recordType: MedicalRecordType.CONSULTATION,
    isConfidential: false,
    diagnosis: 'Flu',
    notes: 'Rest and fluids',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MedicalRecordService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MedicalRecordService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMyRecords', () => {
    it('MedicalRecordService — getMyRecords — happy path — returns records list', () => {
      service.getMyRecords().subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(res.data).toEqual([mockRecord]);
      });

      const req = httpMock.expectOne(`${apiUrl}/my-records`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockRecord], message: 'OK' });
    });

    it('MedicalRecordService — getMyRecords — empty list — returns empty array', () => {
      service.getMyRecords().subscribe((res) => {
        expect(res.data).toEqual([]);
      });

      const req = httpMock.expectOne(`${apiUrl}/my-records`);
      req.flush({ success: true, data: [] });
    });
  });

  describe('downloadMyRecordsCsv', () => {
    it('MedicalRecordService — downloadMyRecordsCsv — happy path — requests CSV blob and triggers download', () => {
      // Spy on DOM manipulation to avoid errors in test environment
      const createElementSpy = spyOn(document, 'createElement').and.callThrough();
      const appendChildSpy = spyOn(document.body, 'appendChild').and.stub();
      const removeChildSpy = spyOn(document.body, 'removeChild').and.stub();
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(window.URL, 'revokeObjectURL').and.stub();

      service.downloadMyRecordsCsv();

      const req = httpMock.expectOne(`${apiUrl}/export/csv`);
      expect(req.request.method).toBe('GET');

      const blob = new Blob(['id,diagnosis'], { type: 'text/csv' });
      req.flush(blob);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });

  describe('downloadMyRecordsPdf', () => {
    it('MedicalRecordService — downloadMyRecordsPdf — happy path — requests PDF blob and triggers download', () => {
      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.stub();
      spyOn(document.body, 'removeChild').and.stub();
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:test');
      spyOn(window.URL, 'revokeObjectURL').and.stub();

      service.downloadMyRecordsPdf();

      const req = httpMock.expectOne(`${apiUrl}/export/pdf`);
      expect(req.request.method).toBe('GET');

      const blob = new Blob(['pdf content'], { type: 'application/pdf' });
      req.flush(blob);

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
