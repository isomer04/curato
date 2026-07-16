# Development Guide

This guide covers local setup, database migrations, Docker, scripts, and testing.
For configuration values see [configuration.md](configuration.md). For deployment
see [deployment.md](deployment.md).

## Prerequisites

- Node.js 22.0.0 or higher
- npm 11.0.0 or higher
- MySQL 8 or higher
- Git

## 1. Clone

```bash
git clone https://github.com/isomer04/curato.git
cd curato
```

## 2. Install Dependencies

```bash
npm run install:all
```

## 3. Configure Environment

```bash
cp backend/.env.example backend/.env
```

PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Update values in `backend/.env` for your local machine. See
[configuration.md](configuration.md) for the full variable reference.

## 4. Create Database

```sql
CREATE DATABASE healthcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 5. Run Migrations

```bash
cd backend
npm run migrate
```

Current migration set:

- `20260322090000-baseline-healthcare-schema.js`: creates baseline tables and indexes
- `20260322100000-add-soft-deletes-doctor-approval-encrypt-insurance.js`: adds soft deletes, doctor approval, and encrypted insurance
- `20260401083000-add-email-verification-expiry-to-users.js`: adds email verification expiry fields
- `20260424000000-db-model-audit-corrections.js`: enforces database model corrections and `RESTRICT` constraints
- `20260425000000-index-strategy-and-enum-expansion.js`: updates index strategy and expands enums
- `20260426000000-normalize-json-columns.js`: normalizes JSON columns into relational tables
- `20261122000100-add-auth-security-columns-to-users.js`: adds auth security token-hash columns and indexes

Apply the one-time PHI audit table creation script:

```bash
npx ts-node scripts/create-phi-audit-table.ts
```

Check migration state if needed:

```bash
npm run migrate:status
```

## 6. Start Development Servers

From the project root:

```bash
npm start
```

This starts backend and frontend concurrently.

Local URLs:

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/api/v1/health

---

## Docker Setup (Optional)

For containerized local development. Production deployment guidance is documented
in [deployment.md](deployment.md).

### 1. Prepare Docker Env File

```bash
cp backend/.env.docker.example backend/.env.docker
```

PowerShell:

```powershell
Copy-Item backend/.env.docker.example backend/.env.docker
```

Update secrets before running containers.

### 2. Start Services

```bash
docker-compose up --build
```

Services:

| Service | Port |
| ------- | ---- |
| MySQL   | 3306 |
| API     | 3000 |

Notes:

- API container connects to MySQL with host `db`
- Docker compose file currently defines database and API services

### 3. Run Migrations in Container

```bash
docker-compose exec api npm run migrate
docker-compose exec api npx ts-node scripts/create-phi-audit-table.ts
```

---

## Scripts

### Root

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| npm run install:all     | Install root, backend, and frontend dependencies |
| npm start               | Start backend and frontend in parallel           |
| npm run contracts:sync  | Synchronize API contract files                   |
| npm run contracts:check | Verify synchronized contracts are committed      |

### Backend

| Command                              | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| npm run dev                          | Start backend in development mode            |
| npm run build                        | Build backend for production                 |
| npm start                            | Run built backend                            |
| npm run lint                         | Lint backend source                          |
| npm run lint:fix                     | Auto-fix lint issues                         |
| npm run format                       | Format backend source                        |
| npm test                             | Run backend tests with open-handle detection |
| npm run test:coverage                | Run tests with coverage                      |
| npm run test:watch                   | Run tests in watch mode                      |
| npm run test:unit                    | Run unit tests only                          |
| npm run test:integration             | Run integration tests only                   |
| npm run typecheck                    | Type-check backend without emit              |
| npm run seed                         | Seed development data                        |
| npm run seed:demo-accounts           | Seed specific demo accounts                  |
| npm run demo-seed                    | Run full demo environment seed               |
| npm run demo-seed:reset              | Reset and recreate demo environment seed     |
| npm run migrate                      | Apply database migrations                    |
| npm run migrate:undo                 | Roll back last migration                     |
| npm run migrate:status               | Show migration status                        |
| npm run migrate:create --name <name> | Create migration file                        |

### Frontend

| Command       | Description                      |
| ------------- | -------------------------------- |
| npm start     | Start Angular development server |
| npm run build | Build Angular app                |
| npm run watch | Build in watch mode              |
| npm test      | Run frontend unit tests          |
| npm run lint  | Lint frontend source             |

---

## Testing

### Backend

```bash
cd backend
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

The backend test setup includes open-handle detection and separate unit or
integration command paths.

### Frontend

```bash
cd frontend
npm test
npm run test -- --watch=false --browsers=ChromeHeadless
```

---

## API Contract Discipline

This project follows versioned API contracts. See
[api-versioning.md](api-versioning.md) for the full policy.

- Public endpoints are mounted under `/api/v1`
- Breaking response or request shape changes require a new major version
- Backend DTO or schema changes must be reflected in frontend contract usage in the same change set

Root helper scripts:

| Command                 | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| npm run contracts:sync  | Sync backend and frontend generated contract artifacts |
| npm run contracts:check | Fail if generated contracts drift from committed state |
