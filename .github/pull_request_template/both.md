## 🔄 Full-Stack Pull Request

### Overview
Briefly describe what changed on both frontend and backend and how the two sides work together.

### Type of Change
- [ ] New feature (frontend + backend)
- [ ] Bug fix (affecting both layers)
- [ ] UI/UX improvement with API changes
- [ ] Refactoring across the stack
- [ ] Performance improvement
- [ ] Other (please specify):

---

## Frontend Changes

### Frontend Code Quality
- [ ] TypeScript types properly defined (no `any`)
- [ ] No ESLint errors (`npm run lint` in `frontend/`)
- [ ] No `console.log` or debug statements left in code
- [ ] Code is DRY

### Frontend UI/UX
- [ ] UI matches design specifications
- [ ] Loading, error, and empty states handled
- [ ] Form validation provides clear feedback

### Frontend Responsiveness & Accessibility
- [ ] Tested on mobile (320px–480px), tablet (768px–1024px), desktop (1280px+)
- [ ] Semantic HTML and ARIA labels used where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA — note: full validation requires manual testing with assistive technologies

### Frontend Testing
- [ ] All existing frontend tests pass (`cd frontend && npm test`)
- [ ] New unit tests added for new components/services
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)

### Frontend Security
- [ ] User input sanitized (XSS prevention)
- [ ] No secrets or tokens hardcoded in frontend code
- [ ] Auth tokens stored securely

---

## Backend Changes

### Backend Code Quality
- [ ] TypeScript types properly defined (no `any`)
- [ ] No ESLint errors (`npm run lint` in `backend/`)
- [ ] No `console.log` or debug statements left in code
- [ ] Error handling comprehensive (try-catch, proper HTTP status codes)

### API & Documentation
- [ ] New/modified endpoints reflected in [`docs/api-reference.md`](../../docs/api-reference.md)
- [ ] [`docs/api-versioning.md`](../../docs/api-versioning.md) policy followed — breaking changes use a new major path
- [ ] Breaking changes described in this PR

### Database
- [ ] Migrations created for schema changes and are reversible
- [ ] Indexes added for frequently queried fields
- [ ] Transactions used for multi-step operations
- [ ] No N+1 queries introduced

### Backend Testing
- [ ] All existing backend tests pass (`cd backend && npm test`)
- [ ] Unit tests added for new functions/methods
- [ ] Integration tests added for new API endpoints

### Backend Security
- [ ] Input validation with Zod on all new routes
- [ ] Authentication required for protected endpoints
- [ ] Authorization checks in place (Patient / Doctor / Admin roles)
- [ ] Sensitive data encrypted at rest
- [ ] Secrets stored in environment variables only
- [ ] Rate limiting considered for new endpoints
- [ ] Audit logging added for PHI-touching operations

### HIPAA (if handling patient data)
- [ ] Patient data encrypted in transit and at rest
- [ ] Access logged via PHI audit middleware
- [ ] PHI absent from logs

### Environment & Configuration
- [ ] New env variables documented in `backend/.env.example`
- [ ] [`docs/configuration.md`](../../docs/configuration.md) updated if needed

---

## API Contract

- [ ] Request/response shape changes reflected in generated contracts
- [ ] `npm run contracts:sync` run from project root
- [ ] `npm run contracts:check` passes with no drift

---

## Integration Testing

### End-to-End Checklist
- [ ] Full user flow works: UI → API → database → response → UI
- [ ] Error handling works across the stack (backend errors display correctly in UI)
- [ ] Auth flow works end-to-end (login, token refresh, logout)
- [ ] Role-based access enforced (unauthorized users blocked at both layers)
- [ ] Data validation consistent on frontend and backend

### Test Scenarios
**Scenario 1:** <!-- e.g., Patient books an appointment -->
1. Frontend:
2. Backend:
3. Expected result:

**Scenario 2:**
1.
2.
3.

### How to Test

**Prerequisites:**
1. Backend running: `cd backend && npm run dev` → http://localhost:3000
2. Frontend running: `cd frontend && npm start` → http://localhost:4200
3. Database migrated: `cd backend && npm run migrate`

**Steps:**
1.
2.
3.

**Expected Behavior:**

### Example API Request
```bash
curl -X POST http://localhost:3000/api/v1/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key": "value"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {}
}
```

---

## Test Results

**Frontend (`cd frontend && npm test`):**
```text
# paste output here
```

**Backend (`cd backend && npm test`):**
```text
# paste output here
```

**Migration output (if applicable):**
```text
# paste: npm run migrate
```

---

## Screenshots / Videos
<!-- Required for UI changes -->

**Before:**

**After:**

**Mobile View (if applicable):**

---

## Performance Impact
- [ ] API response time acceptable (< 200ms for typical endpoints)
- [ ] Frontend bundle size impact reviewed (`npm run build`)
- [ ] No N+1 queries introduced

## Documentation Updates
- [ ] [`docs/api-reference.md`](../../docs/api-reference.md) updated
- [ ] [`docs/configuration.md`](../../docs/configuration.md) updated (if env vars changed)
- [ ] [`docs/architecture.md`](../../docs/architecture.md) updated (if structure changed)
- [ ] README updated if setup steps changed

## Related Issues / PRs
Closes #
Related to #

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes (describe below):

**Migration Instructions:**
1.
2.

## Additional Notes
