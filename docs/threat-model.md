# Threat Model

## Scope
- Backend API (`/api/v1`) and Angular SPA.
- Assets: PHI (medical records, messages), PII (identity/contact), auth/session tokens, audit logs.

## Trust Boundaries
- Browser ↔ API (public network).
- API ↔ Database (private network).
- API ↔ SMTP provider.
- CI/CD ↔ source repository.

## Primary Threats
- Account takeover (credential stuffing, brute force).
- Token theft/replay.
- Broken access control across patient/doctor/admin roles.
- PHI data exposure via insecure endpoints, logs, or exports.
- Injection and payload abuse.
- Supply-chain vulnerabilities in npm dependencies.

## Current Controls
- Rate limiting on sensitive auth/password endpoints.
- Access + refresh token rotation with server-side hashed refresh tokens.
- Role middleware and route-level auth checks.
- Zod request validation on critical endpoints.
- PHI audit logging with retry + terminal failure alert logging.
- CI lint/test/build and dependency vulnerability audit (`npm audit --omit=dev --audit-level=high`).

## Residual Risks
- API contract drift between frontend/backend if not schema-generated.
- Incomplete integration test coverage for authz and middleware chains.
- Operational gaps if audit alerts are not wired to on-call notification channels.

## Mitigations Roadmap
1. Add generated API client/types from backend schema and fail CI on drift.
2. Add integration tests for auth, role guards, validation, and PHI access paths.
3. Route alert-class logs to pager/incident channel and define response SLA.
4. Add secret scanning and dependency SBOM generation in CI.
