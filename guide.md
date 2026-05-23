# Guide — Run the Staff Evaluation System

End-to-end instructions to set up, run, and verify the project locally.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | **22.x** | Pinned in `mise.toml` |
| pnpm | latest | Package manager used by both apps |
| Docker + Docker Compose | latest | Used for PostgreSQL (and optional full-stack) |
| mise | optional | Convenient task runner — `mise run <task>` |
| PostgreSQL client (psql) | optional | For DB inspection |

Install Node + pnpm if you don't have them:

```bash
# via mise (recommended)
mise install

# or manually
nvm install 22 && nvm use 22
npm install -g pnpm
```

---

## 2. Repository Layout

```
staffEvaluationGR2/
├── staffEvaluation-api/   # NestJS backend (port 3001)
├── staffEvaluation-hub/   # React + Vite frontend (port 8080)
├── peer-review-api/       # Auxiliary API
├── docker-compose.yml     # Local dev DB + optional full stack
├── docker-compose.prod.yml
└── mise.toml              # Task runner shortcuts
```

---

## 3. Environment Setup

### 3.1 Backend `.env`

Create `staffEvaluation-api/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/staff_evaluation"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="another-strong-secret"
JWT_REFRESH_EXPIRES_IN="30d"

# Server
PORT=3001
NODE_ENV=development

# Microsoft OAuth (optional — leave blank to disable SSO)
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID=""
MICROSOFT_REDIRECT_URI="http://localhost:3001/auth/microsoft/callback"
FRONTEND_URL="http://localhost:8080"
```

### 3.2 Frontend `.env`

Create `staffEvaluation-hub/.env`:

```env
VITE_API_URL=http://localhost:3001
```

---

## 4. Install Dependencies

```bash
# From repo root — installs both apps
mise run install

# OR manually
cd staffEvaluation-api && pnpm install
cd ../staffEvaluation-hub && pnpm install
```

---

## 5. Start the Database

The fastest path is the bundled Docker Compose service:

```bash
# Start only the postgres container
docker compose up -d db

# Verify it is healthy
docker compose ps
```

Postgres will be available at `localhost:5432` (user `postgres`, password `postgres`, db `staff_evaluation`).

---

## 6. Initialise the Database

```bash
cd staffEvaluation-api

# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed sample data (admin + staff + groups + questions + period)
npx prisma db seed
```

Or use the mise shortcuts:

```bash
mise run db:generate
mise run db:migrate
mise run db:seed
```

To wipe and reseed at any time:

```bash
mise run db:reset      # destructive — drops all data
```

---

## 7. Run the Apps (Development)

### Option A — Both at once (recommended)

```bash
mise run dev
```

Starts both servers in the background. Output will show:

- API:     http://localhost:3001
- Hub:     http://localhost:8080
- Swagger: http://localhost:3001/api/docs

Stop them with:

```bash
mise run stop
```

### Option B — Separately (own terminals)

```bash
# Terminal 1 — backend (watch mode)
cd staffEvaluation-api
pnpm start:dev

# Terminal 2 — frontend
cd staffEvaluation-hub
pnpm dev
```

### Server status

```bash
mise run status
```

---

## 8. Default Login (After Seeding)

See `demo-accounts.md` for the full list. Typical seeded admin:

```
Email:    admin@example.com
Password: Admin@123
```

---

## 9. Run Tests

### Backend

```bash
cd staffEvaluation-api

pnpm test          # unit tests (Jest)
pnpm test:cov      # with coverage report
pnpm test:e2e      # end-to-end HTTP tests
```

### Frontend

```bash
cd staffEvaluation-hub

pnpm test          # vitest run (one-shot)
pnpm test:watch    # watch mode
```

### All in one

```bash
mise run test
mise run test:cov
```

---

## 10. Build for Production

```bash
mise run build           # builds both apps

# Outputs:
#   staffEvaluation-api/dist/
#   staffEvaluation-hub/dist/
```

Run the built backend:

```bash
cd staffEvaluation-api
pnpm start:prod
```

Preview the built frontend:

```bash
cd staffEvaluation-hub
pnpm preview
```

---

## 11. Full Stack via Docker (alternative)

Brings up DB + API + Frontend together:

```bash
# Build images first time
docker compose build

# Start everything
docker compose up -d

# Tail logs
docker compose logs -f

# Tear down
docker compose down
```

URLs after `docker compose up`:
- Frontend: http://localhost
- API:      http://localhost:3001
- DB:       localhost:5432

---

## 12. Useful Tools

| Command | Purpose |
|---|---|
| `mise run db:studio` | Open Prisma Studio (visual DB browser) |
| `mise run lint` | Lint both apps |
| `mise run clean` | Remove `dist/` build artefacts |
| `npx prisma migrate dev --name <change>` | Create a new migration during dev |
| `curl http://localhost:3001/health` | Health check (DB ping) |

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE :3001` | `mise run stop:api` — or `lsof -ti:3001 \| xargs kill -9` |
| `EADDRINUSE :8080` | `mise run stop:hub` |
| Prisma `P1001 can't reach DB` | Ensure `docker compose up -d db` is running and healthy |
| Migration drift after schema edit | `mise run db:reset` (dev only — destroys data) |
| 401 immediately after login | Check `JWT_SECRET` matches between restarts |
| OAuth redirect mismatch | `MICROSOFT_REDIRECT_URI` must equal what's registered in Azure |
| Tests fail with throttling errors | `NODE_ENV=test` is required — Jest configs already set this |

---

## 14. Project Documentation

- `README.md` — full system design document (architecture, ERD, API design, security)
- `docs/solidfix.md` — pre-defense robustness audit + fix log (BE-1..10, FE-1..8)
- `demo-accounts.md` — credentials for the seeded demo users
- `timeline.md` — project milestones
