import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    ForeignKey,
    NonAttribute,
} from 'sequelize';
import { sequelize } from '../config/database';
import { InsuranceStatus } from '../types/constants';
import { Patient } from './Patient.model';

export class Insurance extends Model<
    InferAttributes<Insurance>,
    InferCreationAttributes<Insurance>
> {
    declare id: CreationOptional<string>;
    declare patientId: ForeignKey<Patient['id']>;
    declare providerName: string;
    declare policyNumber: string;
    declare groupNumber: CreationOptional<string>;
    declare subscriberName: string;
    declare subscriberRelation: string;
    declare planType: CreationOptional<string>;
    declare coverageStartDate: Date;
    declare coverageEndDate: CreationOptional<Date>;
    declare copayAmount: CreationOptional<number>;
    declare deductibleAmount: CreationOptional<number>;
    declare deductibleMet: CreationOptional<number>;
    declare verificationStatus: CreationOptional<InsuranceStatus>;
    declare verificationDate: CreationOptional<Date>;
    declare verificationNotes: CreationOptional<string>;
    declare isActive: CreationOptional<boolean>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;

    declare patient?: NonAttribute<Patient>;
}

Insurance.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        patientId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'patients',
                key: 'id',
            },
        },
        providerName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        policyNumber: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        groupNumber: {
            type: DataTypes.STRING(100),
            allowNull: true,
        },
        subscriberName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        subscriberRelation: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'self',
            validate: {
                isIn: [['self', 'spouse', 'child', 'parent', 'other']],
            },
        },
        planType: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        coverageStartDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        coverageEndDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        copayAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
        },
        deductibleAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
        },
        deductibleMet: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0,
            validate: {
                // deductibleMet must never exceed the plan's deductibleAmount.
                // Without this, $1000 met against a $0 deductible is storable.
                deductibleMetWithinBounds(this: Insurance, value: number) {
                    const amount = Number(this.deductibleAmount ?? 0);
                    if (value !== null && value !== undefined && Number(value) > amount) {
                        throw new Error(
                            `deductibleMet (${value}) cannot exceed deductibleAmount (${amount})`
                        );
                    }
                },
            },
        },
        verificationStatus: {
            type: DataTypes.ENUM(...Object.values(InsuranceStatus)),
            allowNull: false,
            defaultValue: InsuranceStatus.PENDING,
        },
        verificationDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        verificationNotes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'insurances',
        timestamps: true,
        paranoid: true, // HIPAA: soft-delete, retain records for 6+ years
        underscored: true,
        indexes: [
            { fields: ['patient_id'] },
            // Composite unique: a patient cannot hold two active records with the
            // same policy number. (policy_number alone is NOT globally unique —
            // different patients may share a group policy from the same employer.)
            {
                name: 'uq_insurance_patient_policy',
                unique: true,
                fields: ['patient_id', 'policy_number'],
            },
            { fields: ['verification_status'] },
            // Composite for the dominant query: active insurance for a patient, ordered by expiry.
            // is_active alone (boolean) is too low-cardinality to index usefully.
            {
                name: 'idx_insurance_patient_active_end',
                fields: ['patient_id', 'is_active', 'coverage_end_date'],
            },
        ],
    }
);
