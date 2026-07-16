import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InsuranceComponent } from './insurance.component';
import { InsuranceService } from '../../../core/services/insurance.service';
import { Insurance, InsuranceStatus } from '../../../core/models';
import { of, throwError } from 'rxjs';

const makeInsurance = (id: string, overrides: Partial<Insurance> = {}): Insurance => ({
    id,
    patientId: 'pt-1',
    providerName: 'BlueCross',
    policyNumber: 'POL-123',
    subscriberName: 'John Patient',
    subscriberRelation: 'self',
    coverageStartDate: '2025-01-01',
    verificationStatus: InsuranceStatus.PENDING,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const listResponse = (insurances: Insurance[]) => ({
    success: true,
    data: { insurances },
    message: 'OK',
});

const singleResponse = (insurance: Insurance) => ({
    success: true,
    data: { insurance },
    message: 'OK',
});

describe('InsuranceComponent', () => {
    let component: InsuranceComponent;
    let fixture: ComponentFixture<InsuranceComponent>;
    let mockInsuranceService: jasmine.SpyObj<InsuranceService>;

    beforeEach(async () => {
        mockInsuranceService = jasmine.createSpyObj('InsuranceService', [
            'getInsurances',
            'createInsurance',
            'updateInsurance',
            'deactivateInsurance',
            'deleteInsurance',
        ]);
        mockInsuranceService.getInsurances.and.returnValue(of(listResponse([])));
        mockInsuranceService.createInsurance.and.returnValue(of(singleResponse(makeInsurance('new-1'))));
        mockInsuranceService.updateInsurance.and.returnValue(of(singleResponse(makeInsurance('ins-1'))));
        mockInsuranceService.deactivateInsurance.and.returnValue(of(singleResponse(makeInsurance('ins-1'))));
        mockInsuranceService.deleteInsurance.and.returnValue(of({ success: true, message: 'Deleted' }));

        await TestBed.configureTestingModule({
            imports: [InsuranceComponent],
            providers: [
                { provide: InsuranceService, useValue: mockInsuranceService },
                provideRouter([]),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(InsuranceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('InsuranceComponent — ngOnInit — calls fetchInsurances', () => {
        expect(mockInsuranceService.getInsurances).toHaveBeenCalled();
    });

    describe('fetchInsurances', () => {
        it('InsuranceComponent — fetchInsurances — success — populates insurances', fakeAsync(() => {
            const ins = makeInsurance('ins-1');
            mockInsuranceService.getInsurances.and.returnValue(of(listResponse([ins])));
            component['fetchInsurances']();
            tick();
            expect(component['insurances']().length).toBe(1);
            expect(component['isLoading']()).toBe(false);
        }));

        it('InsuranceComponent — fetchInsurances — response success false — does not update', fakeAsync(() => {
            mockInsuranceService.getInsurances.and.returnValue(of({ success: false, data: { insurances: [] } }));
            component['insurances'].set([makeInsurance('ins-prev')]);
            component['fetchInsurances']();
            tick();
            // Does not call insurances.set because response.success is false
            expect(component['insurances']().length).toBe(1);
        }));

        it('InsuranceComponent — fetchInsurances — error — sets error message', fakeAsync(() => {
            mockInsuranceService.getInsurances.and.returnValue(throwError(() => new Error('Server')));
            component['fetchInsurances']();
            tick();
            expect(component['error']()).toBe('Failed to load insurance records');
            expect(component['isLoading']()).toBe(false);
        }));
    });

    describe('openForm', () => {
        it('InsuranceComponent — openForm without insurance — resets form and shows', () => {
            component['openForm']();
            expect(component['showForm']()).toBe(true);
            expect(component['editingId']()).toBeNull();
        });

        it('InsuranceComponent — openForm with insurance — populates form for editing', () => {
            const ins = makeInsurance('ins-1', {
                providerName: 'Aetna',
                groupNumber: 'GRP123',
                planType: 'PPO',
                coverageEndDate: '2025-12-31',
                copayAmount: 25,
                deductibleAmount: 500,
            });
            component['openForm'](ins);
            expect(component['showForm']()).toBe(true);
            expect(component['editingId']()).toBe('ins-1');
            expect(component['insuranceForm'].get('providerName')?.value).toBe('Aetna');
        });
    });

    describe('closeForm', () => {
        it('InsuranceComponent — closeForm — hides the form and resets', () => {
            component['showForm'].set(true);
            component['editingId'].set('ins-1');
            component['closeForm']();
            expect(component['showForm']()).toBe(false);
            expect(component['editingId']()).toBeNull();
        });
    });

    describe('onSubmit', () => {
        it('InsuranceComponent — onSubmit — invalid form — returns early', () => {
            component['insuranceForm'].reset();
            component['onSubmit']();
            expect(mockInsuranceService.createInsurance).not.toHaveBeenCalled();
        });

        it('InsuranceComponent — onSubmit — create new — calls createInsurance', fakeAsync(() => {
            component['insuranceForm'].patchValue({
                providerName: 'BlueCross',
                policyNumber: 'POL-999',
                subscriberName: 'Jane Patient',
                subscriberRelation: 'self',
                coverageStartDate: '2025-01-01',
                copayAmount: 20,
                deductibleAmount: 200,
            });
            component['editingId'].set(null);
            component['onSubmit']();
            tick();
            expect(mockInsuranceService.createInsurance).toHaveBeenCalled();
            expect(component['success']()).toBeTruthy();
        }));

        it('InsuranceComponent — onSubmit — create — error — sets error message', fakeAsync(() => {
            component['insuranceForm'].patchValue({
                providerName: 'BlueCross',
                policyNumber: 'POL-999',
                subscriberName: 'Jane Patient',
                subscriberRelation: 'self',
                coverageStartDate: '2025-01-01',
                copayAmount: 20,
                deductibleAmount: 200,
            });
            mockInsuranceService.createInsurance.and.returnValue(throwError(() => new Error('Conflict')));
            component['editingId'].set(null);
            component['onSubmit']();
            tick();
            expect(component['error']()).toBe('Failed to create insurance record');
        }));

        it('InsuranceComponent — onSubmit — update — calls updateInsurance', fakeAsync(() => {
            component['insuranceForm'].patchValue({
                providerName: 'Aetna',
                policyNumber: 'POL-789',
                subscriberName: 'Bob Patient',
                subscriberRelation: 'self',
                coverageStartDate: '2025-01-01',
                copayAmount: 15,
                deductibleAmount: 100,
            });
            component['editingId'].set('ins-1');
            component['onSubmit']();
            tick();
            expect(mockInsuranceService.updateInsurance).toHaveBeenCalledWith('ins-1', jasmine.any(Object));
            expect(component['success']()).toBeTruthy();
        }));

        it('InsuranceComponent — onSubmit — update — error — sets error message', fakeAsync(() => {
            component['insuranceForm'].patchValue({
                providerName: 'Aetna',
                policyNumber: 'POL-789',
                subscriberName: 'Bob Patient',
                subscriberRelation: 'self',
                coverageStartDate: '2025-01-01',
                copayAmount: 15,
                deductibleAmount: 100,
            });
            mockInsuranceService.updateInsurance.and.returnValue(throwError(() => new Error('Not found')));
            component['editingId'].set('ins-edit');
            component['onSubmit']();
            tick();
            expect(component['error']()).toBe('Failed to update insurance record');
        }));
    });

    describe('deactivateInsurance', () => {
        it('InsuranceComponent — deactivateInsurance — user cancels — does nothing', () => {
            spyOn(window, 'confirm').and.returnValue(false);
            component['deactivateInsurance']('ins-1');
            expect(mockInsuranceService.deactivateInsurance).not.toHaveBeenCalled();
        });

        it('InsuranceComponent — deactivateInsurance — confirmed — calls service', fakeAsync(() => {
            spyOn(window, 'confirm').and.returnValue(true);
            component['deactivateInsurance']('ins-1');
            tick();
            expect(mockInsuranceService.deactivateInsurance).toHaveBeenCalledWith('ins-1');
            expect(component['success']()).toBeTruthy();
        }));

        it('InsuranceComponent — deactivateInsurance — error — sets error', fakeAsync(() => {
            spyOn(window, 'confirm').and.returnValue(true);
            mockInsuranceService.deactivateInsurance.and.returnValue(throwError(() => new Error('Server')));
            component['deactivateInsurance']('ins-1');
            tick();
            expect(component['error']()).toBe('Failed to deactivate insurance');
        }));
    });

    describe('deleteInsurance', () => {
        it('InsuranceComponent — deleteInsurance — user cancels — does nothing', () => {
            spyOn(window, 'confirm').and.returnValue(false);
            component['deleteInsurance']('ins-1');
            expect(mockInsuranceService.deleteInsurance).not.toHaveBeenCalled();
        });

        it('InsuranceComponent — deleteInsurance — confirmed — calls service', fakeAsync(() => {
            spyOn(window, 'confirm').and.returnValue(true);
            component['deleteInsurance']('ins-1');
            tick();
            expect(mockInsuranceService.deleteInsurance).toHaveBeenCalledWith('ins-1');
            expect(component['success']()).toBeTruthy();
        }));

        it('InsuranceComponent — deleteInsurance — error — sets error', fakeAsync(() => {
            spyOn(window, 'confirm').and.returnValue(true);
            mockInsuranceService.deleteInsurance.and.returnValue(throwError(() => new Error('Server')));
            component['deleteInsurance']('ins-1');
            tick();
            expect(component['error']()).toBe('Failed to delete insurance record');
        }));
    });

    describe('getStatusClass', () => {
        it('InsuranceComponent — getStatusClass — VERIFIED — returns bg-success', () => {
            expect(component['getStatusClass'](InsuranceStatus.VERIFIED)).toBe('bg-success');
        });

        it('InsuranceComponent — getStatusClass — PENDING — returns bg-warning', () => {
            expect(component['getStatusClass'](InsuranceStatus.PENDING)).toBe('bg-warning text-dark');
        });

        it('InsuranceComponent — getStatusClass — REJECTED — returns bg-danger', () => {
            expect(component['getStatusClass'](InsuranceStatus.REJECTED)).toBe('bg-danger');
        });

        it('InsuranceComponent — getStatusClass — EXPIRED — returns bg-secondary', () => {
            expect(component['getStatusClass'](InsuranceStatus.EXPIRED)).toBe('bg-secondary');
        });
    });

    describe('getStatusIcon', () => {
        it('InsuranceComponent — getStatusIcon — VERIFIED — returns check icon', () => {
            expect(component['getStatusIcon'](InsuranceStatus.VERIFIED)).toBe('bi-check-circle-fill');
        });

        it('InsuranceComponent — getStatusIcon — PENDING — returns hourglass icon', () => {
            expect(component['getStatusIcon'](InsuranceStatus.PENDING)).toBe('bi-hourglass-split');
        });

        it('InsuranceComponent — getStatusIcon — REJECTED — returns x icon', () => {
            expect(component['getStatusIcon'](InsuranceStatus.REJECTED)).toBe('bi-x-circle-fill');
        });

        it('InsuranceComponent — getStatusIcon — EXPIRED — returns clock icon', () => {
            expect(component['getStatusIcon'](InsuranceStatus.EXPIRED)).toBe('bi-clock-history');
        });
    });
});
