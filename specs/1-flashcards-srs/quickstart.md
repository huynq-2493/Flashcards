# Quickstart: Flashcards Learning – Local Development

**Date**: 2026-03-04
**Plan**: [plan.md](plan.md)

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| Docker | ≥ 24.0 | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | ≥ 2.20 | Bundled with Docker Desktop |
| pnpm | ≥ 8.0 | `npm install -g pnpm` |

---

## 1. Clone & Install

```bash
git clone <repo-url> flashcards
cd flashcards

# Install backend dependencies
cd backend && pnpm install && cd ..

# Install frontend dependencies
cd frontend && pnpm install && cd ..
```

---

## 2. Environment Setup

```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`** (edit as needed):
```env
DATABASE_URL="postgresql://flashcards:flashcards@localhost:5432/flashcards_dev"
JWT_ACCESS_SECRET="dev-access-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
```

**`frontend/.env`**:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 3. Start Database

```bash
# Start PostgreSQL in Docker
docker compose up -d postgres

# Wait for healthy status
docker compose ps
```

**`docker-compose.yml`** (root of repo):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: flashcards
      POSTGRES_PASSWORD: flashcards
      POSTGRES_DB: flashcards_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flashcards"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## 4. Database Migrations & Seed

```bash
cd backend

# Run all migrations
pnpm prisma migrate dev

# Seed development data (2 users, 3 decks, 30 cards)
pnpm run seed
```

**Seed accounts**:
| Email | Password | Decks |
|---|---|---|
| `alice@test.com` | `password123` | Japanese N5 (20 cards), World Capitals (10 cards) |
| `bob@test.com` | `password123` | English Vocabulary (10 cards) |

---

## 5. Start Development Servers

```bash
# Terminal 1 – Backend (port 3000)
cd backend && pnpm run dev

# Terminal 2 – Frontend (port 5173)
cd frontend && pnpm run dev
```

Or use the root convenience script:
```bash
pnpm run dev  # starts both via concurrently
```

**Access**:
- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1
- API Health: http://localhost:3000/health

---

## 6. Run Tests

```bash
# Backend unit tests (SRS engine, services)
cd backend && pnpm run test

# Backend unit tests in watch mode
cd backend && pnpm run test:watch

# Backend integration tests (requires running PostgreSQL)
cd backend && pnpm run test:integration

# Frontend tests
cd frontend && pnpm run test

# E2E tests (requires both servers running)
cd frontend && pnpm run test:e2e
```

---

## 7. Verify Setup

After completing steps 1–5, verify the setup is working:

```bash
# 1. Check API health
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}

# 2. Register a test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: 201 with user object

# 3. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: 200 with access_token and refresh_token
```

---

## 8. Common Issues

| Problem | Cause | Fix |
|---|---|---|
| `ECONNREFUSED` on port 5432 | PostgreSQL not running | `docker compose up -d postgres` |
| `Error: P1001` (Prisma can't connect) | Wrong `DATABASE_URL` | Check `.env`; ensure Docker is healthy |
| Migration fails with "already exists" | Stale migration state | `pnpm prisma migrate reset` (dev only — drops data) |
| Port 3000 already in use | Another process on port | `lsof -i :3000` to identify; change `PORT` in `.env` |
| `pnpm: command not found` | pnpm not installed | `npm install -g pnpm` |

---

## 9. Key Scripts Reference

| Script | Location | Purpose |
|---|---|---|
| `pnpm run dev` | `backend/` | Start Express with hot-reload (ts-node-dev) |
| `pnpm run test` | `backend/` | Run Vitest unit tests |
| `pnpm run test:integration` | `backend/` | Run Supertest integration tests |
| `pnpm run seed` | `backend/` | Populate dev database with test data |
| `pnpm prisma studio` | `backend/` | Open Prisma Studio GUI (db browser) |
| `pnpm run dev` | `frontend/` | Start Vite dev server |
| `pnpm run test:e2e` | `frontend/` | Run Playwright E2E tests |
| `pnpm run build` | `frontend/` | Production build to `dist/` |

---

## 10. Project Structure Quick Reference

```
flashcards/
├── backend/
│   ├── src/
│   │   ├── api/           HTTP route handlers
│   │   ├── lib/srs/       SM-2 pure function (sm2.ts + sm2.test.ts)
│   │   ├── middleware/    auth.ts, ownership.ts
│   │   └── prisma/        schema.prisma
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/    Reusable UI (ui/, deck/, card/, session/)
│   │   ├── pages/         Route-level components
│   │   ├── hooks/         Custom React hooks
│   │   └── services/      API client (axios + React Query)
│   └── tests/e2e/
├── docker-compose.yml
├── specs/1-flashcards-srs/   ← You are here
└── README.md
```
