import { Response } from 'express';
import { medicalRecordService } from '../services';
import { asyncHandler, NotFoundError } from '../middleware';
import {
  AuthenticatedRequest,
  AuthenticatedQueryRequest,
} from '../types/express-augment';
import { paginatedResponse } from '../utils/response.util';
import { patientRepository } from '../repositories';
import { MedicalRecord } from '../models';
import { MAX_EXPORT_RECORDS } from '../config/constants';
import type { GetRecordsQuery } from '../dto/medical-record.dto';

export const getMyRecords = asyncHandler(async (req: AuthenticatedQueryRequest<GetRecordsQuery>, res: Response) => {
  const userId = req.user.userId;
  const { page, limit } = req.query;

  const patient = await patientRepository.findByUserId(userId);

  if (!patient) {
    throw new NotFoundError('Patient profile not found');
  }

  const { records, total }: { records: MedicalRecord[]; total: number } =
    await medicalRecordService.findAllByPatientId(patient.id, page, limit);
  paginatedResponse(res, records, total, page, limit);
});

export const exportMyRecordsCsv = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.userId;
  const patient = await patientRepository.findByUserId(userId);

  if (!patient) {
    throw new NotFoundError('Patient profile not found');
  }

  // Fetch records capped to MAX_EXPORT_RECORDS to prevent memory bloat
  const { records: csvRecords }: { records: MedicalRecord[] } =
    await medicalRecordService.findAllByPatientId(patient.id, 1, MAX_EXPORT_RECORDS);
  const csvData = medicalRecordService.convertToCsv(csvRecords);

  res.header('Content-Type', 'text/csv');
  res.attachment(`medical_records_${patient.id}_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csvData);
});

export const exportMyRecordsPdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user.userId;
  const patient = await patientRepository.findByUserId(userId, { withUser: true });

  if (!patient) {
    throw new NotFoundError('Patient profile not found');
  }

  // Fetch records capped to MAX_EXPORT_RECORDS to prevent memory bloat
  const { records: pdfRecords }: { records: MedicalRecord[] } =
    await medicalRecordService.findAllByPatientId(patient.id, 1, MAX_EXPORT_RECORDS);

  const patientName = patient.user
    ? `${patient.user.firstName} ${patient.user.lastName}`
    : 'Unknown';

  res.header('Content-Type', 'application/pdf');
  res.header(
    'Content-Disposition',
    `attachment; filename=medical_records_${patient.id}_${new Date().toISOString().split('T')[0]}.pdf`
  );

  medicalRecordService.generatePdf(pdfRecords, patientName, res);
});
