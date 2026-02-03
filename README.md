# Staff Evaluation Hub

A comprehensive staff evaluation and peer review system built with React, NestJS, and PostgreSQL.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Staff Evaluation Hub                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────────┐     ┌─────────────────┐     ┌───────────┐ │
│   │    Frontend     │────▶│    Backend      │────▶│ PostgreSQL│ │
│   │  (React/Vite)   │     │   (NestJS)      │     │           │ │
│   │   Port: 80      │     │   Port: 3001    │     │ Port: 5432│ │
│   └─────────────────┘     └─────────────────┘     └───────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start with Docker

The easiest way to run the entire stack is with Docker Compose.

### 1. Configure environment

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Database
DB_USER=postgres
DB_PASSWORD=your-secure-password-here
DB_NAME=staff_evaluation

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend
VITE_API_URL=http://localhost:3001
```

### 2. Start the stack

```bash
docker compose up -d
```

This will start:
- **PostgreSQL** on port 5432
- **Backend API** on port 3001
- **Frontend** on port 80

### 3. Access the application

Open `http://localhost` in your browser.

### 4. Seed sample data (optional)

To populate the database with sample data:

```bash
docker compose exec api npx prisma db seed
```

## Local Development

For local development, you can run each service separately.

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm (recommended)

### 1. Start PostgreSQL

Make sure PostgreSQL is running and create the database:

```sql
CREATE DATABASE staff_evaluation;
```

### 2. Start the Backend

```bash
cd staffEvaluation-api
pnpm install
cp .env.example .env  # Configure your environment
npx prisma generate
npx prisma migrate deploy
pnpm start:dev
```

API will be at `http://localhost:3001`

### 3. Start the Frontend

```bash
cd staffEvaluation-hub
pnpm install
echo "VITE_API_URL=http://localhost:3001" > .env
pnpm dev
```

Frontend will be at `http://localhost:8080`

## Test Accounts

After seeding the database, you can login with:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `admin123` | Admin |
| `test@example.com` | `test123` | User |

## Project Structure

```
staffEvaluation/
├── staffEvaluation-hub/   # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks
│   │   ├── pages/         # Page components
│   │   └── integrations/  # API client
│   ├── Dockerfile
│   └── nginx.conf
│
├── staffEvaluation-api/   # NestJS backend
│   ├── src/
│   │   ├── auth/          # Authentication
│   │   ├── staff/         # Staff management
│   │   ├── groups/        # Group management
│   │   ├── questions/     # Evaluation questions
│   │   └── evaluations/   # Evaluations
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Sample data
│   └── Dockerfile
│
├── docker-compose.yml     # Docker orchestration
└── .env.example           # Environment template
```

## Features

- **User Authentication** - JWT-based login with role-based access
- **Staff Management** - Add, edit, and organize staff members
- **Evaluation Groups** - Create groups for peer evaluation
- **Custom Questions** - Define evaluation criteria
- **Peer Reviews** - Submit and manage evaluations
- **Analytics Dashboard** - Visualize evaluation results
- **Organization Structure** - Hierarchical unit management

## Environment Variables

### Database
| Variable | Description |
|----------|-------------|
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | Database name |

### Authentication
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | Token expiration (e.g., "7d") |

### Frontend
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |

## Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild images
docker compose up -d --build

# Access database
docker compose exec db psql -U postgres -d staff_evaluation

# Run migrations
docker compose exec api npx prisma migrate deploy

# Seed database
docker compose exec api npx prisma db seed
```

## API Documentation

When the backend is running, Swagger documentation is available at:

```
http://localhost:3001/api
```

## Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Recharts

**Backend:**
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Passport-JWT
- Swagger

**Infrastructure:**
- Docker
- Docker Compose
- Nginx
