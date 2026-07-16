# Rollout / Rollback Checklist

## Pre-Deploy
- [ ] `npm run lint` and tests pass for backend and frontend.
- [ ] CI security audit jobs pass.
- [ ] Database migrations reviewed and applied in staging.
- [ ] Backward compatibility reviewed for API changes.
- [ ] Environment variables validated for target environment.

## Deployment
- [ ] Deploy backend first when API-compatible with existing frontend.
- [ ] Run `npm run migrate` on backend release.
- [ ] Deploy frontend after backend health is green.
- [ ] Verify `/api/v1/health` and key user flows.

## Smoke Tests
- [ ] Auth: login, refresh-token, logout.
- [ ] Patient: appointment list and booking.
- [ ] Doctor: schedule update.
- [ ] Admin: users list and role/status update.

## Rollback Triggers
- [ ] Elevated 5xx rate.
- [ ] Auth/session failures above baseline.
- [ ] PHI audit persistence terminal failures.

## Rollback Plan
- [ ] Rollback frontend deployment.
- [ ] Rollback backend deployment.
- [ ] Run migration rollback only for reversible, tested migrations.
- [ ] Re-run smoke tests on restored version.
- [ ] Publish incident note with impact and follow-up actions.
