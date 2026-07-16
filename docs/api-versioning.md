# API Versioning Rules

## Canonical Base Path
- All public endpoints are versioned under `/api/v1`.
- Breaking changes require a new major path (`/api/v2`).

## Backward-Compatibility Policy
- Non-breaking additions (new optional fields/endpoints) are allowed in current major version.
- Removing fields, changing required fields, or changing response shapes is breaking.
- If behavior changes but shape is stable, update release notes and add migration notes.

## Contract Discipline
- Backend DTO/schema changes must be reflected in frontend request/response types in the same PR.
- PRs changing API shape must include:
  - Updated DTO/schema.
  - Updated frontend typings/service usage.
  - Tests covering changed contract paths.

## Deprecation Policy
- Mark endpoint/field as deprecated in docs before removal.
- Keep deprecated behavior for at least one release cycle unless a security issue requires immediate removal.

## Review Checklist for API Changes
- Is this change breaking? If yes, requires new major API version.
- Are validation schemas, controllers, and frontend models aligned?
- Are integration/contract tests updated?
- Are release notes and migration notes updated?
