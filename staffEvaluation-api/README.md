# Staff Evaluation Hub - API

A NestJS-based REST API for the Staff Evaluation Hub staff evaluation system.

## Tech Stack

- **NestJS** with TypeScript
- **Prisma** ORM for database access
- **PostgreSQL** database
- **Passport-JWT** for authentication
- **Swagger** for API documentation

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- pnpm (recommended) or npm

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
DATABASE_URL="postgresql://username@localhost:5432/staff_evaluation"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
```

### 3. Set up database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed with sample data
npx prisma db seed
```

### 4. Start development server

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3001`.

## API Documentation

Swagger documentation is available at `http://localhost:3001/api` when the server is running.

## Database Schema

The database includes the following main tables:

- **User** - User accounts with authentication
- **Staff** - Staff members being evaluated
- **Group** - Groups for organizing staff
- **Question** - Evaluation questions
- **Evaluation** - Submitted evaluations
- **OrganizationUnit** - Hierarchical organization structure
- **UserRole** - User role assignments

## Available Scripts

```bash
# Development
pnpm start:dev       # Start with hot-reload

# Production
pnpm build           # Build for production
pnpm start:prod      # Run production build

# Database
npx prisma migrate dev    # Create new migration
npx prisma migrate deploy # Apply migrations
npx prisma db seed        # Seed database
npx prisma studio         # Open Prisma Studio

# Testing
pnpm test            # Run unit tests
pnpm test:e2e        # Run e2e tests
pnpm test:cov        # Run with coverage
```

## Project Structure

```
src/
├── auth/           # Authentication module (JWT, guards)
├── staff/          # Staff management module
├── groups/         # Group management module
├── questions/      # Evaluation questions module
├── evaluations/    # Evaluations module
├── org-units/      # Organization units module
├── users/          # User management module
├── prisma/         # Prisma service
└── main.ts         # Application entry point

prisma/
├── schema.prisma   # Database schema
├── seed.ts         # Database seeding script
└── migrations/     # Database migrations
```

## Test Accounts

After seeding the database:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `admin123` | admin |
| `test@example.com` | `test123` | user |

## Docker

Build the Docker image:

```bash
docker build -t staffevaluation-api .
```

Run the container:

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret" \
  staffevaluation-api
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration | No (default: 7d) |
| `PORT` | Server port | No (default: 3001) |
