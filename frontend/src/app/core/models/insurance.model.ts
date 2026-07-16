import { InsuranceStatus } from './constants';

export interface Insurance {
    id: string;
    patientId: string;
    providerName: string;
    policyNumber: string;
    groupNumber?: string;
    subscriberName: string;
    subscriberRelation: string;
    planType?: string;
    coverageStartDate: string;
    coverageEndDate?: string;
    copayAmount?: number;
    deductibleAmount?: number;
    deductibleMet?: number;
    verificationStatus: InsuranceStatus;
    verificationDate?: string;
    verificationNotes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateInsuranceData {
    providerName: string;
    policyNumber: string;
    groupNumber?: string;
    subscriberName: string;
    subscriberRelation?: string;
    planType?: string;
    coverageStartDate: string;
    coverageEndDate?: string;
    copayAmount?: number;
    deductibleAmount?: number;
}

export interface InsuranceResponse {
    success: boolean;
    data: {
        insurance: Insurance;
    };
    message?: string;
}

export interface InsuranceListResponse {
    success: boolean;
    data: {
        insurances: Insurance[];
    };
}

export interface ActiveInsuranceResponse {
    success: boolean;
    data: {
        hasActiveInsurance: boolean;
        insurance: Insurance | null;
    };
}
