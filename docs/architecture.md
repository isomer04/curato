# Architecture

The backend follows a layered structure:

```text
Client (Angular SPA)
  <-> REST API (Express)
       |- Middleware (auth, validation, rate limiting, error handling, PHI audit)
       |- Controllers
       |- Services
       |- Repositories and Models (Sequelize)
       |- MySQL
```

Key architecture patterns:

- API versioning through a canonical base path
- Strong DTO and schema validation at route boundaries
- Separation of controller, service, and persistence concerns

## Database Schema

The system uses a highly normalized relational model with strict referential
integrity (e.g., `RESTRICT` constraints) to ensure HIPAA-compliant data
retention. Key models include:

- **Core Entities**: User, Patient, Doctor
- **Scheduling**: Appointment, Availability
- **Clinical Data**: MedicalRecord, Prescription, LabResult, Symptom, PatientAllergy, MedicalAttachment
- **System & Comm**: PhiAuditLog, Notification, Message, Insurance
- **Professional Profiles**: DoctorLanguage, DoctorQualification

## Project Structure

```text
curato/
|- backend/
|  |- src/
|  |  |- config/
|  |  |- contracts/
|  |  |- controllers/
|  |  |- dto/
|  |  |- middleware/
|  |  |- models/
|  |  |- repositories/
|  |  |- routes/
|  |  |- services/
|  |  |- shared/
|  |  |- subscribers/
|  |  |- templates/
|  |  |- tests/
|  |  |- types/
|  |  |- utils/
|  |  |- app.ts
|  |  |- server.ts
|  |- scripts/
|  |- migrations/
|  |- package.json
|- frontend/
|  |- src/
|  |  |- app/
|  |  |  |- core/
|  |  |  |- features/
|  |  |  |- shared/
|  |  |- environments/
|  |- package.json
|- docs/
|- scripts/
|- docker-compose.yml
|- package.json
```
