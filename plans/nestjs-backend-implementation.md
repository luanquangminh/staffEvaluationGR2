# NestJS Backend Migration Plan
## Academic Staff Peer Evaluation System

**Migration from**: Supabase (React + PostgreSQL 14.1)
**Migration to**: NestJS + PostgreSQL
**Document Version**: 1.0
**Last Updated**: 2026-01-11

---

## Executive Summary

### Technology Stack Selection

**Backend Framework**: NestJS 10.x (TypeScript, modular architecture)
**ORM**: Prisma 5.x (Recommended)
**Database**: PostgreSQL 14.1+ (maintain compatibility)
**Authentication**: Passport.js + JWT (access/refresh tokens)
**Validation**: class-validator + class-transformer
**Testing**: Jest + Supertest
**API Documentation**: Swagger/OpenAPI

### Why Prisma?

**Selected over TypeORM/MikroORM due to:**
- Superior TypeScript type safety with auto-generated client
- Better migration management and schema visualization
- Simpler relationship handling for current schema (9 tables, multiple M2M)
- Excellent NestJS integration via `@nestjs/prisma`
- Built-in query performance monitoring
- Better developer experience for academic staff workflow patterns

### Migration Complexity Breakdown

| Phase | Complexity | Estimated Effort | Dependencies |
|-------|-----------|-----------------|--------------|
| 1. Project Setup | Low | 2-4 hours | None |
| 2. Database Layer | Medium | 8-12 hours | Phase 1 |
| 3. Auth Module | High | 12-16 hours | Phase 2 |
| 4. Core Modules | Medium | 16-24 hours | Phase 3 |
| 5. Business Logic | High | 20-30 hours | Phase 4 |
| 6. API Design | Medium | 8-12 hours | Phase 4 |
| 7. Testing | Medium | 12-20 hours | All phases |
| 8. Frontend Migration | High | 16-24 hours | Phase 6 |
| 9. Deployment Setup | Medium | 8-12 hours | All phases |

**Total Estimated Effort**: 102-154 hours (~3-4 weeks for single developer)

---

## Phase 1: Project Initialization

### 1.1 NestJS CLI Setup

```bash
# Install NestJS CLI globally
npm i -g @nestjs/cli

# Create new project
nest new peer-review-backend
cd peer-review-backend

# Install core dependencies
npm install @nestjs/config @nestjs/jwt @nestjs/passport
npm install @nestjs/swagger @nestjs/throttler
npm install passport passport-jwt passport-local bcrypt
npm install class-validator class-transformer
npm install @prisma/client
npm install --save-dev prisma @types/passport-jwt @types/passport-local @types/bcrypt

# Security and utilities
npm install helmet compression
npm install @nestjs/serve-static # For serving React build if needed
```

### 1.2 Recommended Folder Structure

```
peer-review-backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── roles.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── interfaces/
│   │       └── pagination.interface.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   ├── strategies/
│   │   │   └── interfaces/
│   │   ├── staff/
│   │   │   ├── staff.module.ts
│   │   │   ├── staff.controller.ts
│   │   │   ├── staff.service.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   ├── organization-units/
│   │   ├── groups/
│   │   ├── questions/
│   │   ├── evaluations/
│   │   ├── subjects/
│   │   ├── user-roles/
│   │   ├── dashboard/
│   │   └── reports/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### 1.3 Configuration Management

**File**: `src/config/app.config.ts`
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
```

**File**: `src/config/database.config.ts`
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));
```

**File**: `src/config/jwt.config.ts`
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
```

**File**: `.env.example`
```env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/peer_review_db?schema=public"

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_ROUNDS=10
```

---

## Phase 2: Database Layer with Prisma

### 2.1 Prisma Schema Migration

**File**: `prisma/schema.prisma`

```prisma
// This is your Prisma schema file

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AppRole {
  admin
  moderator
  user

  @@map("app_role")
}

model OrganizationUnit {
  id    Int     @id @db.SmallInt
  name  String  @db.VarChar(50)

  staff  Staff[]
  groups Group[]

  @@map("organizationunits")
}

model Staff {
  id                 Int       @id @default(autoincrement())
  name               String?   @db.VarChar(256)
  emailh             String?   @db.VarChar(256)
  emails             String?   @db.VarChar(256)
  staffcode          String?   @db.VarChar(50)
  sex                Int?      @db.SmallInt
  birthday           DateTime? @db.Date
  mobile             String?   @db.VarChar(50)
  academicrank       String?   @db.VarChar(50)
  academicdegree     String?   @db.VarChar(50)
  organizationunitid Int?      @db.SmallInt
  bidv               String?   @db.VarChar(50)

  organizationUnit OrganizationUnit? @relation(fields: [organizationunitid], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "fk_staff_organizationunits")

  profile             Profile?
  staff2groups        Staff2Group[]
  reviewedEvaluations Evaluation[]    @relation("ReviewerEvaluations")
  receivedEvaluations Evaluation[]    @relation("VictimEvaluations")

  @@map("staff")
}

model Group {
  id                 Int   @id @default(autoincrement())
  name               String @db.VarChar(1024)
  organizationunitid Int?   @db.SmallInt

  organizationUnit OrganizationUnit? @relation(fields: [organizationunitid], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "groups_organizationunitid_fkey")

  staff2groups Staff2Group[]
  subjects     Subject[]
  evaluations  Evaluation[]

  @@map("groups")
}

model Question {
  id          Int     @id @default(autoincrement())
  title       String  @db.VarChar(1024)
  description String? @db.VarChar(1024)

  evaluations Evaluation[]

  @@map("questions")
}

model Subject {
  id        Int     @id @default(autoincrement())
  subjectid String? @db.VarChar(50)
  name      String? @db.VarChar(256)
  groupid   Int?

  group Group? @relation(fields: [groupid], references: [id], onDelete: NoAction, onUpdate: NoAction, map: "fk_subjects_groups")

  @@map("subjects")
}

model Staff2Group {
  id      Int @id @default(autoincrement())
  staffid Int
  groupid Int

  staff Staff @relation(fields: [staffid], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_staff2groups_staff")
  group Group @relation(fields: [groupid], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_staff2groups_groups")

  @@map("staff2groups")
}

model Evaluation {
  id           Int       @id @default(autoincrement())
  reviewerid   Int?
  victimid     Int?
  groupid      Int?
  modifieddate DateTime? @default(now()) @db.Timestamp(6)
  point        Float?    @db.DoublePrecision
  questionid   Int?

  reviewer Staff?    @relation("ReviewerEvaluations", fields: [reviewerid], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_evaluations_reviewer")
  victim   Staff?    @relation("VictimEvaluations", fields: [victimid], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_evaluations_victim")
  group    Group?    @relation(fields: [groupid], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_evaluations_groups")
  question Question? @relation(fields: [questionid], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_evaluations_questions")

  @@map("evaluations")
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  profile   Profile?
  userRoles UserRole[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model Profile {
  id        String   @id @db.Uuid
  staffId   Int?     @unique @map("staff_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user  User   @relation(fields: [id], references: [id], onDelete: Cascade)
  staff Staff? @relation(fields: [staffId], references: [id], onDelete: SetNull)

  @@map("profiles")
}

model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  role      AppRole
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@map("user_roles")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}
```

### 2.2 Migration Strategy from Supabase

**Step 1: Export existing Supabase data**
```bash
# Using Supabase CLI
supabase db dump -f roles --data-only > data/auth_users.sql
pg_dump -h db.xxx.supabase.co -U postgres -d postgres --schema=public --data-only > data/public_schema_data.sql
```

**Step 2: Initialize Prisma**
```bash
npx prisma init
# Edit prisma/schema.prisma with content above
npx prisma generate
npx prisma migrate dev --name init
```

**Step 3: Create migration script to transform Supabase auth.users to users table**

**File**: `prisma/migrations/transform-auth-users.sql`
```sql
-- This migration transforms Supabase auth.users to users table
-- Run manually after init migration

INSERT INTO users (id, email, password_hash, created_at, updated_at)
SELECT
  id,
  email,
  encrypted_password, -- Supabase uses bcrypt
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

**Step 4: Create seed file for development**

**File**: `prisma/seed.ts`
```typescript
import { PrismaClient, AppRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create organization units
  const orgUnits = await Promise.all([
    prisma.organizationUnit.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Khoa Công nghệ Thông tin' },
    }),
    prisma.organizationUnit.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Khoa Kinh tế' },
    }),
  ]);

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
    },
  });

  // Create admin role
  await prisma.userRole.upsert({
    where: {
      userId_role: {
        userId: adminUser.id,
        role: AppRole.admin,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      role: AppRole.admin,
    },
  });

  // Create test staff
  const staff1 = await prisma.staff.create({
    data: {
      name: 'Nguyễn Văn A',
      staffcode: 'GV001',
      emailh: 'nguyenvana@hust.edu.vn',
      organizationunitid: 1,
      academicrank: 'PGS',
      academicdegree: 'Tiến sỹ',
    },
  });

  // Link admin user to staff
  await prisma.profile.create({
    data: {
      id: adminUser.id,
      staffId: staff1.id,
    },
  });

  // Create questions
  const questions = await Promise.all([
    prisma.question.create({
      data: {
        title: 'Năng lực chuyên môn',
        description: 'Đánh giá về kiến thức chuyên môn và kỹ năng giảng dạy',
      },
    }),
    prisma.question.create({
      data: {
        title: 'Thái độ làm việc',
        description: 'Đánh giá về tinh thần trách nhiệm và thái độ nghề nghiệp',
      },
    }),
  ]);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Update package.json**
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### 2.3 Prisma Service Setup

**File**: `src/prisma/prisma.module.ts`
```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**File**: `src/prisma/prisma.service.ts`
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method to get current user's staff_id
  async getMyStaffId(userId: string): Promise<number | null> {
    const profile = await this.profile.findUnique({
      where: { id: userId },
      select: { staffId: true },
    });
    return profile?.staffId ?? null;
  }

  // Helper method to check if user has role
  async hasRole(userId: string, role: string): Promise<boolean> {
    const userRole = await this.userRole.findFirst({
      where: {
        userId,
        role: role as any,
      },
    });
    return !!userRole;
  }
}
```

---

## Phase 3: Authentication & Authorization Module

### 3.1 Password Hashing Strategy

**Use Argon2** (more secure than bcrypt for 2026 standards)

```bash
npm install argon2
```

**File**: `src/modules/auth/crypto.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class CryptoService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
```

### 3.2 JWT Strategy

**File**: `src/modules/auth/strategies/jwt.strategy.ts`
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        profile: { include: { staff: true } },
        userRoles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      staffId: user.profile?.staffId ?? null,
      roles: user.userRoles.map((r) => r.role),
    };
  }
}
```

**File**: `src/modules/auth/strategies/jwt-refresh.strategy.ts`
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.body['refreshToken'];

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > tokenRecord.expiresAt) {
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
```

### 3.3 Guards

**File**: `src/common/guards/jwt-auth.guard.ts`
```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

**File**: `src/common/guards/roles.guard.ts`
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 3.4 Decorators

**File**: `src/common/decorators/public.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**File**: `src/common/decorators/roles.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';
import { AppRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
```

**File**: `src/common/decorators/current-user.decorator.ts`
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  userId: string;
  email: string;
  staffId: number | null;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

### 3.5 Auth DTOs

**File**: `src/modules/auth/dto/login.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
```

**File**: `src/modules/auth/dto/register.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  staffId?: number;
}
```

**File**: `src/modules/auth/dto/refresh-token.dto.ts`
```typescript
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
```

### 3.6 Auth Service

**File**: `src/modules/auth/auth.service.ts`
```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AppRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await this.cryptoService.hashPassword(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        profile: {
          create: {
            staffId: registerDto.staffId,
          },
        },
        userRoles: {
          create: {
            role: AppRole.user,
          },
        },
      },
      include: {
        profile: true,
        userRoles: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      staffId: user.profile?.staffId,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        profile: true,
        userRoles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.cryptoService.verifyPassword(
      user.passwordHash,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        staffId: user.profile?.staffId,
        roles: user.userRoles.map((r) => r.role),
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!tokenRecord || tokenRecord.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Delete old refresh token
      await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

      // Generate new tokens
      return this.generateTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      // Logout from all devices
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
```

### 3.7 Auth Controller

**File**: `src/modules/auth/auth.controller.ts`
```typescript
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(
    @CurrentUser('userId') userId: string,
    @Body() body?: { refreshToken?: string },
  ) {
    await this.authService.logout(userId, body?.refreshToken);
  }
}
```

### 3.8 Auth Module

**File**: `src/modules/auth/auth.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // Configuration via ConfigService in strategies
  ],
  controllers: [AuthController],
  providers: [AuthService, CryptoService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Phase 4: Core Modules Design

### 4.1 Staff Module

**File**: `src/modules/staff/dto/create-staff.dto.ts`
```typescript
import { IsString, IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  emailh?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  emails?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  staffcode?: string;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  sex?: number;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  birthday?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  academicrank?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  academicdegree?: string;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  organizationunitid?: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bidv?: string;
}
```

**File**: `src/modules/staff/dto/update-staff.dto.ts`
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
```

**File**: `src/modules/staff/staff.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: createStaffDto,
      include: { organizationUnit: true },
    });
  }

  async findAll(filters?: { organizationunitid?: number }) {
    return this.prisma.staff.findMany({
      where: filters,
      include: {
        organizationUnit: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        organizationUnit: true,
        staff2groups: {
          include: { group: true },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return staff;
  }

  async update(id: number, updateStaffDto: UpdateStaffDto) {
    try {
      return await this.prisma.staff.update({
        where: { id },
        data: updateStaffDto,
        include: { organizationUnit: true },
      });
    } catch {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.staff.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }
  }

  async findByOrganizationUnit(organizationUnitId: number) {
    return this.prisma.staff.findMany({
      where: { organizationunitid: organizationUnitId },
      include: { organizationUnit: true },
    });
  }

  async findColleaguesInGroup(groupId: number, excludeStaffId?: number) {
    const staff2groups = await this.prisma.staff2Group.findMany({
      where: {
        groupid: groupId,
        ...(excludeStaffId && { staffid: { not: excludeStaffId } }),
      },
      include: {
        staff: {
          include: { organizationUnit: true },
        },
      },
    });

    return staff2groups.map((sg) => sg.staff);
  }
}
```

**File**: `src/modules/staff/staff.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { AppRole } from '@prisma/client';

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(AppRole.admin)
  @ApiOperation({ summary: 'Create new staff member (Admin only)' })
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all staff members' })
  @ApiQuery({ name: 'organizationunitid', required: false, type: Number })
  findAll(@Query('organizationunitid', ParseIntPipe) organizationunitid?: number) {
    return this.staffService.findAll(
      organizationunitid ? { organizationunitid } : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOne(id);
  }

  @Patch(':id')
  @Roles(AppRole.admin)
  @ApiOperation({ summary: 'Update staff member (Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.update(id, updateStaffDto);
  }

  @Delete(':id')
  @Roles(AppRole.admin)
  @ApiOperation({ summary: 'Delete staff member (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.remove(id);
  }

  @Get('group/:groupId/colleagues')
  @ApiOperation({ summary: 'Get colleagues in a group' })
  findColleagues(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('excludeStaffId', ParseIntPipe) excludeStaffId?: number,
  ) {
    return this.staffService.findColleaguesInGroup(groupId, excludeStaffId);
  }
}
```

**File**: `src/modules/staff/staff.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
```

### 4.2 Evaluations Module (Key Business Logic)

**File**: `src/modules/evaluations/dto/create-evaluation.dto.ts`
```typescript
import { IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @ApiProperty()
  @IsInt()
  victimid: number;

  @ApiProperty()
  @IsInt()
  groupid: number;

  @ApiProperty()
  @IsInt()
  questionid: number;

  @ApiProperty({ minimum: 0, maximum: 4 })
  @IsNumber()
  @Min(0)
  @Max(4)
  point: number;
}
```

**File**: `src/modules/evaluations/dto/update-evaluation.dto.ts`
```typescript
import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEvaluationDto {
  @ApiProperty({ minimum: 0, maximum: 4 })
  @IsNumber()
  @Min(0)
  @Max(4)
  point: number;
}
```

**File**: `src/modules/evaluations/dto/bulk-upsert-evaluation.dto.ts`
```typescript
import { IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateEvaluationDto } from './create-evaluation.dto';

export class BulkUpsertEvaluationDto {
  @ApiProperty()
  @IsInt()
  victimid: number;

  @ApiProperty()
  @IsInt()
  groupid: number;

  @ApiProperty({ type: [CreateEvaluationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationDto)
  evaluations: CreateEvaluationDto[];
}
```

**File**: `src/modules/evaluations/evaluations.service.ts`
```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async create(createEvaluationDto: CreateEvaluationDto, reviewerId: number) {
    // Prevent self-evaluation
    if (reviewerId === createEvaluationDto.victimid) {
      throw new BadRequestException('Cannot evaluate yourself');
    }

    // Verify reviewer is in the group
    const reviewerInGroup = await this.prisma.staff2Group.findFirst({
      where: {
        staffid: reviewerId,
        groupid: createEvaluationDto.groupid,
      },
    });

    if (!reviewerInGroup) {
      throw new ForbiddenException('You are not in this group');
    }

    // Verify victim is in the group
    const victimInGroup = await this.prisma.staff2Group.findFirst({
      where: {
        staffid: createEvaluationDto.victimid,
        groupid: createEvaluationDto.groupid,
      },
    });

    if (!victimInGroup) {
      throw new BadRequestException('Victim is not in this group');
    }

    return this.prisma.evaluation.create({
      data: {
        ...createEvaluationDto,
        reviewerid: reviewerId,
        modifieddate: new Date(),
      },
    });
  }

  async upsert(createEvaluationDto: CreateEvaluationDto, reviewerId: number) {
    // Validate same as create
    if (reviewerId === createEvaluationDto.victimid) {
      throw new BadRequestException('Cannot evaluate yourself');
    }

    const existing = await this.prisma.evaluation.findFirst({
      where: {
        reviewerid: reviewerId,
        victimid: createEvaluationDto.victimid,
        groupid: createEvaluationDto.groupid,
        questionid: createEvaluationDto.questionid,
      },
    });

    if (existing) {
      return this.prisma.evaluation.update({
        where: { id: existing.id },
        data: {
          point: createEvaluationDto.point,
          modifieddate: new Date(),
        },
      });
    }

    return this.create(createEvaluationDto, reviewerId);
  }

  async bulkUpsert(
    victimid: number,
    groupid: number,
    evaluations: CreateEvaluationDto[],
    reviewerId: number,
  ) {
    // Transaction to ensure atomicity
    return this.prisma.$transaction(
      evaluations.map((evalDto) =>
        this.upsert(
          {
            victimid,
            groupid,
            questionid: evalDto.questionid,
            point: evalDto.point,
          },
          reviewerId,
        ),
      ),
    );
  }

  async findAll(filters?: {
    reviewerid?: number;
    victimid?: number;
    groupid?: number;
  }) {
    return this.prisma.evaluation.findMany({
      where: filters,
      include: {
        reviewer: true,
        victim: true,
        group: true,
        question: true,
      },
      orderBy: { modifieddate: 'desc' },
    });
  }

  async findMyEvaluations(reviewerId: number, groupId?: number) {
    return this.findAll({
      reviewerid: reviewerId,
      ...(groupId && { groupid: groupId }),
    });
  }

  async findOne(id: number) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: {
        reviewer: true,
        victim: true,
        group: true,
        question: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${id} not found`);
    }

    return evaluation;
  }

  async update(id: number, updateEvaluationDto: UpdateEvaluationDto, reviewerId: number) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${id} not found`);
    }

    if (evaluation.reviewerid !== reviewerId) {
      throw new ForbiddenException('You can only update your own evaluations');
    }

    return this.prisma.evaluation.update({
      where: { id },
      data: {
        point: updateEvaluationDto.point,
        modifieddate: new Date(),
      },
    });
  }

  async remove(id: number, reviewerId: number) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluation with ID ${id} not found`);
    }

    if (evaluation.reviewerid !== reviewerId) {
      throw new ForbiddenException('You can only delete your own evaluations');
    }

    return this.prisma.evaluation.delete({ where: { id } });
  }
}
```

**File**: `src/modules/evaluations/evaluations.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { BulkUpsertEvaluationDto } from './dto/bulk-upsert-evaluation.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { AppRole } from '@prisma/client';

@ApiTags('Evaluations')
@ApiBearerAuth()
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new evaluation' })
  create(
    @Body() createEvaluationDto: CreateEvaluationDto,
    @CurrentUser('staffId') staffId: number,
  ) {
    return this.evaluationsService.create(createEvaluationDto, staffId);
  }

  @Post('upsert')
  @ApiOperation({ summary: 'Create or update evaluation' })
  upsert(
    @Body() createEvaluationDto: CreateEvaluationDto,
    @CurrentUser('staffId') staffId: number,
  ) {
    return this.evaluationsService.upsert(createEvaluationDto, staffId);
  }

  @Post('bulk-upsert')
  @ApiOperation({ summary: 'Bulk create/update evaluations for a colleague' })
  bulkUpsert(
    @Body() bulkDto: BulkUpsertEvaluationDto,
    @CurrentUser('staffId') staffId: number,
  ) {
    return this.evaluationsService.bulkUpsert(
      bulkDto.victimid,
      bulkDto.groupid,
      bulkDto.evaluations,
      staffId,
    );
  }

  @Get()
  @Roles(AppRole.admin)
  @ApiOperation({ summary: 'Get all evaluations (Admin only)' })
  findAll(
    @Query('reviewerid', ParseIntPipe) reviewerid?: number,
    @Query('victimid', ParseIntPipe) victimid?: number,
    @Query('groupid', ParseIntPipe) groupid?: number,
  ) {
    return this.evaluationsService.findAll({ reviewerid, victimid, groupid });
  }

  @Get('my-evaluations')
  @ApiOperation({ summary: 'Get my evaluations' })
  findMyEvaluations(
    @CurrentUser('staffId') staffId: number,
    @Query('groupid', ParseIntPipe) groupId?: number,
  ) {
    return this.evaluationsService.findMyEvaluations(staffId, groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evaluation by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evaluationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update evaluation' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
    @CurrentUser('staffId') staffId: number,
  ) {
    return this.evaluationsService.update(id, updateEvaluationDto, staffId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete evaluation' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('staffId') staffId: number) {
    return this.evaluationsService.remove(id, staffId);
  }
}
```

### 4.3 Dashboard Module (Statistics)

**File**: `src/modules/dashboard/dashboard.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatistics(groupId?: number) {
    const whereClause = groupId ? { groupid: groupId } : {};

    const [totalEvaluations, avgScoreData, staffEvaluated] = await Promise.all([
      this.prisma.evaluation.count({ where: whereClause }),
      this.prisma.evaluation.aggregate({
        where: { ...whereClause, point: { not: null } },
        _avg: { point: true },
      }),
      this.prisma.evaluation.groupBy({
        by: ['victimid'],
        where: whereClause,
        _count: true,
      }),
    ]);

    return {
      totalEvaluations,
      avgScore: avgScoreData._avg.point || 0,
      staffEvaluated: staffEvaluated.length,
    };
  }

  async getStaffRankings(groupId?: number) {
    const whereClause = groupId ? { groupid: groupId } : {};

    const evaluations = await this.prisma.evaluation.findMany({
      where: { ...whereClause, point: { not: null } },
      include: {
        victim: true,
        question: true,
      },
    });

    // Group by victim
    const scoreMap = new Map<
      number,
      {
        staff: any;
        total: number;
        count: number;
        byQuestion: Map<number, { total: number; count: number }>;
      }
    >();

    evaluations.forEach((e) => {
      if (!e.victimid || e.point === null) return;

      if (!scoreMap.has(e.victimid)) {
        scoreMap.set(e.victimid, {
          staff: e.victim,
          total: 0,
          count: 0,
          byQuestion: new Map(),
        });
      }

      const staffData = scoreMap.get(e.victimid)!;
      staffData.total += e.point;
      staffData.count += 1;

      if (e.questionid) {
        if (!staffData.byQuestion.has(e.questionid)) {
          staffData.byQuestion.set(e.questionid, { total: 0, count: 0 });
        }
        const qData = staffData.byQuestion.get(e.questionid)!;
        qData.total += e.point;
        qData.count += 1;
      }
    });

    // Convert to array and calculate averages
    const rankings = Array.from(scoreMap.entries()).map(([staffId, data]) => ({
      staffId,
      staff: data.staff,
      avgScore: data.count > 0 ? data.total / data.count : 0,
      evalCount: data.count,
      questionScores: Object.fromEntries(
        Array.from(data.byQuestion.entries()).map(([qId, q]) => [
          qId,
          q.count > 0 ? q.total / q.count : 0,
        ]),
      ),
    }));

    // Sort by average score descending
    rankings.sort((a, b) => b.avgScore - a.avgScore);

    return rankings;
  }
}
```

**File**: `src/modules/dashboard/dashboard.controller.ts`
```typescript
import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get evaluation statistics' })
  @ApiQuery({ name: 'groupId', required: false, type: Number })
  getStatistics(@Query('groupId', ParseIntPipe) groupId?: number) {
    return this.dashboardService.getStatistics(groupId);
  }

  @Get('rankings')
  @ApiOperation({ summary: 'Get staff rankings by average score' })
  @ApiQuery({ name: 'groupId', required: false, type: Number })
  getRankings(@Query('groupId', ParseIntPipe) groupId?: number) {
    return this.dashboardService.getStaffRankings(groupId);
  }
}
```

### 4.4 Reports Module (CSV Export)

**File**: `src/modules/reports/reports.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateCSVReport(groupId?: number): Promise<string> {
    const whereClause = groupId ? { groupid: groupId } : {};

    const [evaluations, questions, staff] = await Promise.all([
      this.prisma.evaluation.findMany({
        where: { ...whereClause, point: { not: null } },
        include: { victim: true, question: true },
      }),
      this.prisma.question.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.staff.findMany(),
    ]);

    // Calculate scores per staff
    const scoreMap = new Map<number, { staff: any; scores: Map<number, number[]> }>();

    evaluations.forEach((e) => {
      if (!e.victimid || e.point === null) return;

      if (!scoreMap.has(e.victimid)) {
        scoreMap.set(e.victimid, { staff: e.victim, scores: new Map() });
      }

      const data = scoreMap.get(e.victimid)!;
      if (!data.scores.has(e.questionid!)) {
        data.scores.set(e.questionid!, []);
      }
      data.scores.get(e.questionid!)!.push(e.point);
    });

    // Build CSV
    const BOM = '\uFEFF';
    const headers = ['Hạng', 'Giảng viên', 'Mã GV'];
    questions.forEach((q) => headers.push(q.title));
    headers.push('Điểm trung bình', 'Số đánh giá');

    const rows: string[][] = [];
    rows.push(headers);

    const staffScores = Array.from(scoreMap.entries())
      .map(([staffId, data]) => {
        const questionAvgs = questions.map((q) => {
          const scores = data.scores.get(q.id) || [];
          return scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;
        });

        const totalAvg =
          questionAvgs.reduce((sum, s) => sum + s, 0) / questionAvgs.length;

        return {
          staff: data.staff,
          questionAvgs,
          totalAvg,
          evalCount: Array.from(data.scores.values()).flat().length,
        };
      })
      .sort((a, b) => b.totalAvg - a.totalAvg);

    staffScores.forEach((item, idx) => {
      const row = [
        (idx + 1).toString(),
        item.staff.name || '',
        item.staff.staffcode || '',
        ...item.questionAvgs.map((avg) => avg.toFixed(2)),
        item.totalAvg.toFixed(2),
        item.evalCount.toString(),
      ];
      rows.push(row);
    });

    // Convert to CSV string
    const csvContent =
      BOM + rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    return csvContent;
  }
}
```

**File**: `src/modules/reports/reports.controller.ts`
```typescript
import { Controller, Get, Query, ParseIntPipe, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { AppRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('export-csv')
  @Roles(AppRole.admin)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="BaoCaoDanhGia.csv"')
  @ApiOperation({ summary: 'Export evaluation report as CSV (Admin only)' })
  @ApiQuery({ name: 'groupId', required: false, type: Number })
  async exportCSV(@Query('groupId', ParseIntPipe) groupId?: number) {
    return this.reportsService.generateCSVReport(groupId);
  }
}
```

---

## Phase 5: API Endpoints Specification

### Complete REST API Structure

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| **Auth** | | | | |
| POST | `/auth/register` | Register new user | Public | - |
| POST | `/auth/login` | Login user | Public | - |
| POST | `/auth/refresh` | Refresh access token | Public | - |
| POST | `/auth/logout` | Logout user | Required | - |
| **Staff** | | | | |
| GET | `/staff` | Get all staff | Required | - |
| GET | `/staff/:id` | Get staff by ID | Required | - |
| POST | `/staff` | Create staff | Required | admin |
| PATCH | `/staff/:id` | Update staff | Required | admin |
| DELETE | `/staff/:id` | Delete staff | Required | admin |
| GET | `/staff/group/:groupId/colleagues` | Get colleagues in group | Required | - |
| **Organization Units** | | | | |
| GET | `/organization-units` | Get all org units | Required | - |
| POST | `/organization-units` | Create org unit | Required | admin |
| **Groups** | | | | |
| GET | `/groups` | Get all groups | Required | - |
| GET | `/groups/:id` | Get group by ID | Required | - |
| POST | `/groups` | Create group | Required | admin |
| PATCH | `/groups/:id` | Update group | Required | admin |
| DELETE | `/groups/:id` | Delete group | Required | admin |
| POST | `/groups/:id/staff` | Add staff to group | Required | admin |
| DELETE | `/groups/:groupId/staff/:staffId` | Remove staff from group | Required | admin |
| GET | `/groups/my-groups` | Get current user's groups | Required | - |
| **Questions** | | | | |
| GET | `/questions` | Get all questions | Required | - |
| POST | `/questions` | Create question | Required | admin |
| PATCH | `/questions/:id` | Update question | Required | admin |
| DELETE | `/questions/:id` | Delete question | Required | admin |
| **Evaluations** | | | | |
| POST | `/evaluations` | Create evaluation | Required | - |
| POST | `/evaluations/upsert` | Create/update evaluation | Required | - |
| POST | `/evaluations/bulk-upsert` | Bulk create/update | Required | - |
| GET | `/evaluations` | Get all evaluations | Required | admin |
| GET | `/evaluations/my-evaluations` | Get my evaluations | Required | - |
| GET | `/evaluations/:id` | Get evaluation by ID | Required | - |
| PATCH | `/evaluations/:id` | Update evaluation | Required | - |
| DELETE | `/evaluations/:id` | Delete evaluation | Required | - |
| **Dashboard** | | | | |
| GET | `/dashboard/statistics` | Get statistics | Required | - |
| GET | `/dashboard/rankings` | Get staff rankings | Required | - |
| **Reports** | | | | |
| GET | `/reports/export-csv` | Export CSV report | Required | admin |
| **User Roles** | | | | |
| GET | `/user-roles/my-roles` | Get my roles | Required | - |
| POST | `/user-roles` | Assign role | Required | admin |
| DELETE | `/user-roles/:id` | Remove role | Required | admin |

---

## Phase 6: Validation & Error Handling

### Global Exception Filter

**File**: `src/common/filters/http-exception.filter.ts`
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

### Validation Pipe Configuration

**File**: `src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Peer Review Hub API')
    .setDescription('Academic Staff Peer Evaluation System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('app.port');
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
```

---

## Phase 7: Security Considerations

### Security Checklist

**File**: `src/app.module.ts` (Security configuration)
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
// ... other imports

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    StaffModule,
    // ... other modules
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global auth guard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Global roles guard
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Global rate limiting
    },
  ],
})
export class AppModule {}
```

### Security Measures

1. **Helmet.js**: HTTP headers security
2. **CORS**: Configured for specific origin
3. **Rate Limiting**: ThrottlerModule (100 req/min)
4. **SQL Injection Prevention**: Prisma parameterized queries
5. **XSS Protection**: class-validator sanitization
6. **Password Hashing**: Argon2 (2026 standard)
7. **JWT**: Short-lived access tokens (15min) + refresh tokens (7d)
8. **RBAC**: Role-based guards enforced globally

---

## Phase 8: Testing Strategy

### Unit Tests Example

**File**: `src/modules/auth/auth.service.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: CryptoService, useValue: { hashPassword: jest.fn(), verifyPassword: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests...
});
```

### E2E Tests Example

**File**: `test/e2e/auth.e2e-spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);
  });

  it('/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
  });
});
```

### Testing Checklist

**Unit Tests:**
- [ ] Auth service (register, login, refresh)
- [ ] Crypto service (hashing, verification)
- [ ] Staff service (CRUD operations)
- [ ] Evaluations service (business logic, validations)
- [ ] Dashboard service (statistics calculations)

**Integration Tests:**
- [ ] Database operations with test database
- [ ] Prisma queries and relationships
- [ ] Transaction handling

**E2E Tests:**
- [ ] Auth flow (register → login → refresh → logout)
- [ ] Evaluation workflow (select group → select colleague → submit)
- [ ] Admin operations (staff CRUD, role assignment)
- [ ] CSV export

---

## Phase 9: Frontend Integration

### API Client Migration

**File**: `peer-review-hub/src/lib/api-client.ts`
```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);

            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/auth';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  get axios() {
    return this.client;
  }
}

export const apiClient = new ApiClient().axios;
```

### Auth Hook Migration

**File**: `peer-review-hub/src/hooks/useAuth.tsx`
```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  staffId: number | null;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, staffId?: number) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data } = await apiClient.get('/auth/me'); // You need to implement this endpoint
      setUser(data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const signUp = async (email: string, password: string, staffId?: number) => {
    const { data } = await apiClient.post('/auth/register', {
      email,
      password,
      staffId,
    });
    return data;
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.roles.includes('admin') || false,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### React Query Hooks Migration

**File**: `peer-review-hub/src/hooks/useStaff.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Staff {
  id: number;
  name: string | null;
  staffcode: string | null;
  emailh: string | null;
  emails: string | null;
  academicrank: string | null;
  academicdegree: string | null;
  organizationunitid: number | null;
}

// Get all staff
export const useStaff = () => {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await apiClient.get<Staff[]>('/staff');
      return data;
    },
  });
};

// Get my groups
export const useMyGroups = (staffId: number | null) => {
  return useQuery({
    queryKey: ['groups', 'my', staffId],
    queryFn: async () => {
      const { data } = await apiClient.get('/groups/my-groups');
      return data;
    },
    enabled: !!staffId,
  });
};

// Get colleagues in group
export const useColleaguesInGroup = (groupId: number | null, excludeStaffId?: number) => {
  return useQuery({
    queryKey: ['staff', 'group', groupId, 'colleagues', excludeStaffId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/staff/group/${groupId}/colleagues`,
        {
          params: { excludeStaffId },
        },
      );
      return data;
    },
    enabled: !!groupId,
  });
};

// Create evaluation mutation
export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluation: {
      victimid: number;
      groupid: number;
      questionid: number;
      point: number;
    }) => {
      const { data } = await apiClient.post('/evaluations/upsert', evaluation);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
  });
};
```

---

## Phase 10: Development Workflow

### Docker Compose Setup

**File**: `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14.1-alpine
    container_name: peer-review-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: peer_review_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - peer-review-network

  backend:
    build:
      context: ./peer-review-backend
      dockerfile: Dockerfile
    container_name: peer-review-backend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/peer_review_db?schema=public
      JWT_ACCESS_SECRET: dev-access-secret
      JWT_REFRESH_SECRET: dev-refresh-secret
    ports:
      - '3000:3000'
    depends_on:
      - postgres
    volumes:
      - ./peer-review-backend:/app
      - /app/node_modules
    networks:
      - peer-review-network

  frontend:
    build:
      context: ./peer-review-hub
      dockerfile: Dockerfile.dev
    container_name: peer-review-frontend
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:3000/api
    ports:
      - '5173:5173'
    volumes:
      - ./peer-review-hub:/app
      - /app/node_modules
    networks:
      - peer-review-network

volumes:
  postgres_data:

networks:
  peer-review-network:
    driver: bridge
```

### Backend Dockerfile

**File**: `peer-review-backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
```

### Production Dockerfile

**File**: `peer-review-backend/Dockerfile.prod`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

---

## Phase 11: Deployment Preparation

### Environment Variables Checklist

**Production `.env`**
```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.com

DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public

JWT_ACCESS_SECRET=generate-with-openssl-rand-base64-64
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=generate-with-openssl-rand-base64-64
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_ROUNDS=12
```

### Health Check Endpoint

**File**: `src/app.controller.ts`
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

### Database Migration Workflow

```bash
# Development
npm run prisma:migrate:dev

# Production (apply migrations)
npm run prisma:migrate:deploy

# Generate Prisma Client
npm run prisma:generate

# Seed database
npm run prisma:seed
```

**Update package.json scripts:**
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate:dev": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
  }
}
```

---

## Phase 12: Migration Execution Plan

### Step-by-Step Migration

**Week 1: Backend Foundation**
- [ ] Day 1-2: NestJS project setup, Prisma schema, database migration
- [ ] Day 3-4: Auth module (JWT, guards, decorators)
- [ ] Day 5: Testing auth module

**Week 2: Core Modules**
- [ ] Day 1-2: Staff, OrganizationUnits, Groups modules
- [ ] Day 3-4: Questions, Evaluations modules (business logic)
- [ ] Day 5: Testing core modules

**Week 3: Features & Frontend**
- [ ] Day 1-2: Dashboard, Reports modules
- [ ] Day 3-4: Frontend API client migration
- [ ] Day 5: Frontend hooks migration (React Query)

**Week 4: Testing & Deployment**
- [ ] Day 1-2: E2E tests, integration tests
- [ ] Day 3-4: Docker setup, production deployment
- [ ] Day 5: Data migration from Supabase, smoke testing

### Data Migration Script

**File**: `scripts/migrate-supabase-data.ts`
```typescript
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

async function migrateData() {
  console.log('Starting data migration...');

  // 1. Migrate users
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  for (const authUser of authUsers?.users || []) {
    await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email!,
        passwordHash: authUser.encrypted_password || '',
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(authUser.updated_at || authUser.created_at),
      },
    });
  }

  // 2. Migrate organization units
  const { data: orgUnits } = await supabase.from('organizationunits').select('*');
  for (const ou of orgUnits || []) {
    await prisma.organizationUnit.create({ data: ou });
  }

  // 3. Migrate staff
  const { data: staffList } = await supabase.from('staff').select('*');
  for (const staff of staffList || []) {
    await prisma.staff.create({
      data: {
        ...staff,
        birthday: staff.birthday ? new Date(staff.birthday) : null,
      },
    });
  }

  // 4. Migrate profiles
  const { data: profiles } = await supabase.from('profiles').select('*');
  for (const profile of profiles || []) {
    await prisma.profile.create({
      data: {
        id: profile.id,
        staffId: profile.staff_id,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      },
    });
  }

  // ... Continue for other tables

  console.log('Migration completed!');
}

migrateData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Unresolved Questions

1. **Authentication Migration**: How to handle existing user sessions during migration? Recommend forced re-login after backend switch.

2. **Real-time Features**: Current Supabase has real-time subscriptions. Does NestJS need WebSocket support for live updates? If yes, recommend implementing with `@nestjs/websockets`.

3. **File Storage**: Current schema has `bidv` field (possibly bank account). Any file upload requirements? If yes, recommend integrating AWS S3 or local filesystem with multer.

4. **Email Notifications**: Password reset flow requires email service. Should we integrate SendGrid/Nodemailer?

5. **Soft Deletes**: Should staff/groups support soft deletes or hard deletes? Current plan uses hard deletes (Prisma cascade).

6. **Multi-tenancy**: Is there a need for multi-university support in future? Affects schema design.

---

## Summary

**Total Implementation Effort**: ~3-4 weeks (102-154 hours)

**Technology Choices:**
- **NestJS 10**: Production-ready framework with excellent TypeScript support
- **Prisma 5**: Superior type safety, better DX than TypeORM for this use case
- **Argon2**: Modern password hashing (more secure than bcrypt)
- **JWT**: Industry standard for stateless auth

**Key Architectural Decisions:**
- Clean architecture with modular design
- Global guards for auth/RBAC enforcement
- Prisma transactions for evaluation bulk operations
- CSV export with UTF-8 BOM for Vietnamese compatibility

**Migration Path**: Phased approach (backend → frontend → data) minimizes risk

**Next Steps**: Begin with Phase 1 (Project Initialization) and execute sequentially through Phase 12.

---

**Plan Document Location**: `/Users/minhbohung111/workspace/projects/staffEvaluation/plans/nestjs-backend-implementation.md`
