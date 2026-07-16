import { Router } from 'express';
import { env } from '../config/env';
import authRoutes from './auth.routes';
import appointmentRoutes from './appointment.routes';
import doctorRoutes from './doctor.routes';
import patientRoutes from './patient.routes';
import medicalRecordRoutes from './medical-record.routes';
import messageRoutes from './message.routes';
import insuranceRoutes from './insurance.routes';
import adminRoutes from './admin.routes';

const router = Router();

// API Health check
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Healthcare API is running',
    timestamp: new Date().toISOString(),
    version: env.apiVersion,
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/messages', messageRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/admin', adminRoutes);

export default router;
