# API Reference

All endpoints are under `/api/v1`. For versioning policy see
[api-versioning.md](api-versioning.md).

## Health

| Method | Endpoint | Description                  |
| ------ | -------- | ---------------------------- |
| GET    | /health  | API health and version check |

## Authentication

| Method | Endpoint                  | Description                   |
| ------ | ------------------------- | ----------------------------- |
| POST   | /auth/register            | Register user                 |
| POST   | /auth/register/patient    | Register patient with profile |
| POST   | /auth/register/doctor     | Register doctor with profile  |
| POST   | /auth/login               | Login                         |
| POST   | /auth/verify-mfa          | Verify MFA during login       |
| POST   | /auth/refresh-token       | Refresh access token          |
| POST   | /auth/logout              | Logout and revoke session     |
| POST   | /auth/change-password     | Change password               |
| GET    | /auth/profile             | Get current user profile      |
| PATCH  | /auth/profile             | Update current user profile   |
| POST   | /auth/request-email-change| Request email change          |
| POST   | /auth/confirm-email-change| Confirm email change          |
| POST   | /auth/setup-mfa           | Start MFA setup               |
| POST   | /auth/verify-setup-mfa    | Finalize MFA setup            |
| POST   | /auth/forgot-password     | Request password reset        |
| POST   | /auth/reset-password      | Complete password reset       |
| POST   | /auth/verify-email        | Verify email                  |
| POST   | /auth/resend-verification | Resend verification email     |

## Appointments

| Method | Endpoint                      | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| GET    | /appointments                 | List appointments            |
| GET    | /appointments/available-slots | Get available slots          |
| GET    | /appointments/dashboard-stats | Patient dashboard aggregates |
| GET    | /appointments/:id             | Get appointment details      |
| POST   | /appointments                 | Book appointment             |
| PUT    | /appointments/:id             | Update appointment           |
| POST   | /appointments/:id/cancel      | Cancel appointment           |
| POST   | /appointments/:id/confirm     | Confirm appointment          |
| POST   | /appointments/:id/complete    | Complete appointment         |

## Doctors

| Method | Endpoint                  | Description                           |
| ------ | ------------------------- | ------------------------------------- |
| GET    | /doctors                  | List doctors                          |
| GET    | /doctors/:id              | Get doctor profile                    |
| GET    | /doctors/patients         | Get doctor's assigned patients        |
| GET    | /doctors/:id/availability | Get doctor availability               |
| GET    | /doctors/availability     | Get authenticated doctor availability |
| PUT    | /doctors/profile          | Update doctor profile                 |
| POST   | /doctors/availability     | Create availability slot              |
| PUT    | /doctors/availability/:id | Update availability slot              |
| DELETE | /doctors/availability/:id | Delete availability slot              |
| POST   | /doctors/schedule         | Set weekly schedule                   |

## Patients

| Method | Endpoint          | Description                 |
| ------ | ----------------- | --------------------------- |
| GET    | /patients/me      | Get current patient profile |
| PUT    | /patients/profile | Update patient profile      |
| GET    | /patients/:id     | Get patient profile by ID   |

## Medical Records

| Method | Endpoint                    | Description                     |
| ------ | --------------------------- | ------------------------------- |
| GET    | /medical-records/my-records | Get records for current patient |
| GET    | /medical-records/export/csv | Export records as CSV           |
| GET    | /medical-records/export/pdf | Export records as PDF           |

## Messages

| Method | Endpoint                        | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| GET    | /messages/users                 | List users available for messaging |
| GET    | /messages/unread-count          | Get unread count                   |
| GET    | /messages/conversations         | List conversations                 |
| GET    | /messages/conversations/:userId | Get conversation with one user     |
| POST   | /messages                       | Send message                       |
| PATCH  | /messages/read/:senderId        | Mark sender messages as read       |

## Insurance

| Method | Endpoint                      | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| POST   | /insurance                    | Create insurance record               |
| GET    | /insurance                    | Get current patient insurance records |
| GET    | /insurance/active             | Get active insurance record           |
| GET    | /insurance/:id                | Get insurance by id                   |
| PUT    | /insurance/:id                | Update insurance record               |
| POST   | /insurance/:id/deactivate     | Deactivate insurance record           |
| DELETE | /insurance/:id                | Delete insurance record               |
| POST   | /insurance/:id/verify         | Verify insurance record               |
| GET    | /insurance/patient/:patientId | Get insurance by patient id           |

## Admin

| Method | Endpoint                   | Description                |
| ------ | -------------------------- | -------------------------- |
| GET    | /admin/stats               | System statistics          |
| GET    | /admin/users               | List users                 |
| POST   | /admin/users               | Create user                |
| PATCH  | /admin/users/:id           | Update user role or status |
| DELETE | /admin/users/:id           | Delete user                |
| GET    | /admin/doctors/pending     | List pending doctors       |
| PATCH  | /admin/doctors/:id/approve | Approve doctor             |
| PATCH  | /admin/doctors/:id/reject  | Reject doctor              |
