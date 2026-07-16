## 🔧 Backend Pull Request

### Overview
Briefly describe what changes have been made on the backend.

### Type of Change
- [ ] New API endpoint
- [ ] Bug fix
- [ ] Database schema change
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Security enhancement
- [ ] Other (please specify):

### Code Quality Checklist
- [ ] Code follows the project's coding standards and style guide
- [ ] All TypeScript types are properly defined (no `any` types used)
- [ ] No ESLint errors or warnings (`cd backend && npm run lint`)
- [ ] No `console.log` or debugging statements left in code
- [ ] Code is DRY — no unnecessary duplication
- [ ] Functions and variables have clear, descriptive names
- [ ] Complex logic has explanatory comments
- [ ] Dead/commented-out code has been removed
- [ ] Error handling is comprehensive (try-catch blocks where needed)
- [ ] Proper HTTP status codes are returned

### API & Documentation Checklist
- [ ] New/modified endpoints are reflected in [`docs/api-reference.md`](../../docs/api-reference.md)
- [ ] API versioning is maintained — breaking changes go under a new major path
- [ ] Breaking changes are clearly described in this PR
- [ ] Input validation rules are documented
- [ ] Authentication/authorization requirements are specified
- [ ] [`docs/api-versioning.md`](../../docs/api-versioning.md) policy is followed

### Database Checklist
- [ ] Database migrations are created (if schema changed)
- [ ] Migrations are reversible (down migration implemented)
- [ ] Indexes are added for frequently queried fields
- [ ] Foreign key constraints are properly defined
- [ ] Database queries are optimized (no N+1 queries)
- [ ] Transactions are used for multi-step operations

### Testing Checklist
- [ ] All existing tests pass (`cd backend && npm test`)
- [ ] Unit tests added for new functions/methods
- [ ] Integration tests added for new API endpoints
- [ ] Edge cases and error scenarios are tested
- [ ] Test cleanup properly resets state (no test pollution)

### Security Checklist
- [ ] Input validation implemented for all user inputs (Zod)
- [ ] SQL injection prevention (parameterized queries / Sequelize ORM)
- [ ] Authentication required for protected endpoints
- [ ] Authorization checks in place (role-based: Patient / Doctor / Admin)
- [ ] Sensitive data encrypted at rest (AES-256-GCM)
- [ ] Secrets and API keys stored in environment variables (not hardcoded)
- [ ] Rate limiting considered for new endpoints
- [ ] CORS remains properly configured (no wildcard in production)
- [ ] Security headers maintained (Helmet)
- [ ] JWT tokens have appropriate expiration times
- [ ] Audit logging added for PHI-touching operations

### HIPAA Checklist (if handling patient data)
- [ ] Patient data encrypted in transit (HTTPS/TLS)
- [ ] Patient data encrypted at rest
- [ ] Access to patient data logged via PHI audit middleware
- [ ] Only authorized roles can access patient data
- [ ] PHI is NOT present in logs

### Performance Checklist
- [ ] Database queries optimized (no N+1 queries)
- [ ] Pagination implemented for large result sets
- [ ] Resource cleanup is correct (connections, streams, etc.)

### Environment & Configuration
- [ ] New environment variables documented in `backend/.env.example`
- [ ] [`docs/configuration.md`](../../docs/configuration.md) updated if variable reference changed
- [ ] Backward compatibility maintained for existing configs

### How to Test
**Prerequisites:**
1.
2.

**Steps:**
1.
2.
3.

**Expected Result:**

**Example request:**
```bash
curl -X POST http://localhost:3000/api/v1/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key": "value"}'
```

**Test output:**
```text
# paste: cd backend && npm test
```

**Migration output (if applicable):**
```text
# paste: npm run migrate
```

### Related Issues / PRs
Closes #
Related to #

### Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes (describe below):

### Additional Notes
