import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InsuranceService } from './insurance.service';
import { Insurance, InsuranceStatus } from '../models';
import { environment } from '../../../environments/environment';

describe('InsuranceService', () => {
  let service: InsuranceService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/insurance`;

  const mockInsurance: Insurance = {
    id: 'ins-1',
    patientId: 'pt-1',
    providerName: 'BlueCross',
    policyNumber: 'POL-123',
    subscriberName: 'John Doe',
    subscriberRelation: 'self',
    coverageStartDate: '2025-01-01',
    verificationStatus: InsuranceStatus.PENDING,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InsuranceService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InsuranceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('computed signals — initial state', () => {
    it('InsuranceService — initial state — insurances is empty', () => {
      expect(service.insurances()).toEqual([]);
    });

    it('InsuranceService — initial state — activeInsurance is null', () => {
      expect(service.activeInsurance()).toBeNull();
    });

    it('InsuranceService — initial state — hasActiveInsurance is false', () => {
      expect(service.hasActiveInsurance()).toBeFalse();
    });

    it('InsuranceService — initial state — isLoading is false', () => {
      expect(service.isLoading()).toBeFalse();
    });
  });

  describe('getInsurances', () => {
    it('InsuranceService — getInsurances — happy path — sets insurances signal and clears loading', () => {
      service.getInsurances().subscribe((res) => {
        expect(res.data.insurances).toEqual([mockInsurance]);
      });

      expect(service.isLoading()).toBeTrue();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { insurances: [mockInsurance] } });

      expect(service.insurances()).toEqual([mockInsurance]);
      expect(service.isLoading()).toBeFalse();
    });

    it('InsuranceService — getInsurances — empty list — sets empty array', () => {
      service.getInsurances().subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush({ success: true, data: { insurances: [] } });

      expect(service.insurances()).toEqual([]);
    });
  });

  describe('getInsuranceById', () => {
    it('InsuranceService — getInsuranceById — happy path — sends GET to correct URL', () => {
      service.getInsuranceById('ins-1').subscribe((res) => {
        expect(res.data.insurance).toEqual(mockInsurance);
      });

      const req = httpMock.expectOne(`${apiUrl}/ins-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { insurance: mockInsurance } });
    });
  });

  describe('getActiveInsurance', () => {
    it('InsuranceService — getActiveInsurance — has active insurance — sets activeInsurance signal', () => {
      service.getActiveInsurance().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/active`);
      expect(req.request.method).toBe('GET');
      req.flush({
        success: true,
        data: { hasActiveInsurance: true, insurance: mockInsurance },
      });

      expect(service.activeInsurance()).toEqual(mockInsurance);
      expect(service.hasActiveInsurance()).toBeTrue();
    });

    it('InsuranceService — getActiveInsurance — no active insurance — sets activeInsurance to null', () => {
      service.getActiveInsurance().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/active`);
      req.flush({ success: true, data: { hasActiveInsurance: false, insurance: null } });

      expect(service.activeInsurance()).toBeNull();
      expect(service.hasActiveInsurance()).toBeFalse();
    });
  });

  describe('createInsurance', () => {
    it('InsuranceService — createInsurance — happy path — prepends to insurances list', () => {
      const existing = { ...mockInsurance, id: 'ins-0' };
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([existing]);

      const createData = {
        providerName: 'Aetna',
        policyNumber: 'POL-999',
        subscriberName: 'Jane Doe',
        coverageStartDate: '2025-06-01',
      };

      const newInsurance = { ...mockInsurance, id: 'ins-2', ...createData };

      service.createInsurance(createData).subscribe();

      expect(service.isLoading()).toBeTrue();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createData);
      req.flush({ success: true, data: { insurance: newInsurance } });

      expect(service.insurances().length).toBe(2);
      expect(service.insurances()[0].id).toBe('ins-2');
      expect(service.isLoading()).toBeFalse();
    });
  });

  describe('updateInsurance', () => {
    it('InsuranceService — updateInsurance — existing record — updates in-place', () => {
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance]);

      const updated = { ...mockInsurance, providerName: 'Cigna' };

      service.updateInsurance('ins-1', { providerName: 'Cigna' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/ins-1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, data: { insurance: updated } });

      expect(service.insurances()[0].providerName).toBe('Cigna');
    });

    it('InsuranceService — updateInsurance — id not found — list unchanged', () => {
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance]);

      service.updateInsurance('nonexistent', { providerName: 'Other' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/nonexistent`);
      req.flush({ success: true, data: { insurance: { ...mockInsurance, id: 'nonexistent' } } });

      // Original insurance remains unchanged
      expect(service.insurances()[0].providerName).toBe('BlueCross');
    });
  });

  describe('deactivateInsurance', () => {
    it('InsuranceService — deactivateInsurance — updates list and clears activeInsurance when it matches', () => {
      const active = { ...mockInsurance, isActive: true };
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([active]);
      (service as unknown as { activeInsuranceSignal: { set: (v: Insurance | null) => void } }).activeInsuranceSignal.set(active);

      const deactivated = { ...active, isActive: false };

      service.deactivateInsurance('ins-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/ins-1/deactivate`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: { insurance: deactivated } });

      expect(service.insurances()[0].isActive).toBeFalse();
      expect(service.activeInsurance()).toBeNull();
    });

    it('InsuranceService — deactivateInsurance — active insurance is different — does not clear activeInsurance', () => {
      const other = { ...mockInsurance, id: 'ins-other' };
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance]);
      (service as unknown as { activeInsuranceSignal: { set: (v: Insurance | null) => void } }).activeInsuranceSignal.set(other);

      service.deactivateInsurance('ins-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/ins-1/deactivate`);
      req.flush({ success: true, data: { insurance: { ...mockInsurance, isActive: false } } });

      expect(service.activeInsurance()).toEqual(other);
    });
  });

  describe('deleteInsurance', () => {
    it('InsuranceService — deleteInsurance — happy path — removes from list', () => {
      const ins2 = { ...mockInsurance, id: 'ins-2' };
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance, ins2]);

      service.deleteInsurance('ins-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/ins-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, message: 'Deleted' });

      expect(service.insurances().length).toBe(1);
      expect(service.insurances()[0].id).toBe('ins-2');
    });

    it('InsuranceService — deleteInsurance — active matches — clears activeInsurance', () => {
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance]);
      (service as unknown as { activeInsuranceSignal: { set: (v: Insurance | null) => void } }).activeInsuranceSignal.set(mockInsurance);

      service.deleteInsurance('ins-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/ins-1`);
      req.flush({ success: true, message: 'Deleted' });

      expect(service.activeInsurance()).toBeNull();
    });
  });

  describe('getPatientInsurance', () => {
    it('InsuranceService — getPatientInsurance — happy path — sends GET to patient endpoint', () => {
      service.getPatientInsurance('pt-1').subscribe((res) => {
        expect(res.data.insurances).toEqual([mockInsurance]);
      });

      const req = httpMock.expectOne(`${apiUrl}/patient/pt-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { insurances: [mockInsurance] } });
    });
  });

  describe('verifyInsurance', () => {
    it('InsuranceService — verifyInsurance — happy path — updates insurance in list', () => {
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance]);

      const verified = { ...mockInsurance, verificationStatus: InsuranceStatus.VERIFIED };

      service.verifyInsurance('ins-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/ins-1/verify`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: { insurance: verified } });

      expect(service.insurances()[0].verificationStatus).toBe(InsuranceStatus.VERIFIED);
    });

    it('InsuranceService — verifyInsurance — id not in list — list unchanged', () => {
      (service as unknown as { insurancesSignal: { set: (v: Insurance[]) => void } }).insurancesSignal.set([mockInsurance]);

      service.verifyInsurance('nonexistent').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/nonexistent/verify`);
      req.flush({ success: true, data: { insurance: { ...mockInsurance, id: 'nonexistent', verificationStatus: InsuranceStatus.VERIFIED } } });

      // Original unchanged
      expect(service.insurances()[0].verificationStatus).toBe(InsuranceStatus.PENDING);
    });
  });
});
