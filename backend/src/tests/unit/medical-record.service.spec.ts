jest.mock('../../repositories/medical-record.repository', () => ({
  medicalRecordRepository: {
    findAllByPatientId: jest.fn(),
  },
}));

jest.mock('pdfkit', () =>
  jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    y: 100,
    end: jest.fn(),
  }))
);

import { medicalRecordService } from '../../services/medical-record.service';
import { medicalRecordRepository } from '../../repositories/medical-record.repository';
import { MedicalRecord } from '../../models';

// Minimal MedicalRecord shape to support the service methods
const makeRecord = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'r1',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    recordType: 'CONSULTATION',
    diagnosis: 'Hypertension',
    notes: 'Monitor blood pressure',
    labResults: [],
    prescriptions: [],
    doctor: {
      user: { firstName: 'John', lastName: 'Doe' },
    },
    ...overrides,
  }) as unknown as MedicalRecord;

describe('MedicalRecordService', () => {
  beforeEach(() => jest.clearAllMocks());


  describe('findAllByPatientId', () => {
    it('returns records for a patient', async () => {
      (medicalRecordRepository.findAllByPatientId as jest.Mock).mockResolvedValue([makeRecord()]);
      const result = await medicalRecordService.findAllByPatientId('p1');
      expect(result).toHaveLength(1);
      expect(medicalRecordRepository.findAllByPatientId).toHaveBeenCalledWith('p1', 1, 10);
    });

    it('returns empty array when patient has no records', async () => {
      (medicalRecordRepository.findAllByPatientId as jest.Mock).mockResolvedValue([]);
      const result = await medicalRecordService.findAllByPatientId('p99');
      expect(result).toHaveLength(0);
    });
  });


  describe('convertToCsv', () => {
    it('produces a CSV with header row', () => {
      const records = [makeRecord()];
      const csv = medicalRecordService.convertToCsv(records);
      expect(csv).toContain('Record ID');
      expect(csv).toContain('Diagnosis');
    });

    it('includes record data in CSV rows', () => {
      const records = [makeRecord({ diagnosis: 'Hypertension' })];
      const csv = medicalRecordService.convertToCsv(records);
      expect(csv).toContain('Hypertension');
    });

    it('returns just the header for empty records array', () => {
      const csv = medicalRecordService.convertToCsv([]);
      const lines = csv.split('\n');
      // Should have only the header row
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Record ID');
    });

    it('renders lab results summary', () => {
      const records = [
        makeRecord({
          labResults: [{ testName: 'Blood Glucose', result: '5.5', unit: 'mmol/L' }],
        }),
      ];
      const csv = medicalRecordService.convertToCsv(records);
      expect(csv).toContain('Blood Glucose');
      expect(csv).toContain('mmol/L');
    });

    it('renders prescriptions summary', () => {
      const records = [
        makeRecord({
          prescriptions: [{ medication: 'Aspirin', dosage: '100mg daily' }],
        }),
      ];
      const csv = medicalRecordService.convertToCsv(records);
      expect(csv).toContain('Aspirin');
      expect(csv).toContain('100mg daily');
    });

    it('falls back to Unknown doctor when doctor info is missing', () => {
      const records = [makeRecord({ doctor: null })];
      const csv = medicalRecordService.convertToCsv(records);
      expect(csv).toContain('Unknown');
    });

    it('escapes double-quotes in notes', () => {
      const records = [makeRecord({ notes: 'He said "I feel better"' })];
      const csv = medicalRecordService.convertToCsv(records);
      expect(csv).toContain('He said ""I feel better""');
    });
  });


  describe('generatePdf', () => {
    it('writes PDF to stream without throwing (empty records)', () => {
      const stream = { write: jest.fn(), end: jest.fn() } as unknown as NodeJS.WritableStream;
      expect(() => medicalRecordService.generatePdf([], 'Alice Smith', stream)).not.toThrow();
    });

    it('writes PDF with records (smoke test)', () => {
      const records = [
        makeRecord({
          labResults: [{ testName: 'CBC', result: 'Normal', unit: '' }],
          prescriptions: [{ medication: 'Metformin', dosage: '500mg' }],
          notes: 'Follow up in 2 weeks',
        }),
      ];
      const stream = { write: jest.fn(), end: jest.fn() } as unknown as NodeJS.WritableStream;
      expect(() => medicalRecordService.generatePdf(records, 'Bob Jones', stream)).not.toThrow();
    });

    it('generates divider between multiple records (index < length-1 branch)', () => {
      const records = [makeRecord({ id: 'r1', notes: null }), makeRecord({ id: 'r2' })];
      const stream = { write: jest.fn(), end: jest.fn() } as unknown as NodeJS.WritableStream;
      // Should not throw when drawing dividers between records
      expect(() => medicalRecordService.generatePdf(records, 'Carol White', stream)).not.toThrow();
    });

    it('skips notes section when record has no notes', () => {
      const records = [makeRecord({ notes: null })];
      const stream = { write: jest.fn(), end: jest.fn() } as unknown as NodeJS.WritableStream;
      expect(() => medicalRecordService.generatePdf(records, 'Dave Brown', stream)).not.toThrow();
    });
  });
});
