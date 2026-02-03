# NestJS Backend Implementation Plan

## Staff Evaluation System - Backend Migration

**Project:** peer-review-hub
**Current Stack:** React 18 + Supabase
**Target Stack:** React 18 + NestJS + Prisma + PostgreSQL
**Date:** 2026-01-11

---

## Executive Summary

Migrate from Supabase backend to custom NestJS backend while maintaining frontend compatibility. Reuse existing PostgreSQL database (Supabase-hosted) initially, with option to migrate to self-hosted PostgreSQL later.

**Key Decisions:**
- Modular monolith architecture (not microservices - small team, single domain)
- Prisma ORM for type-safe database access
- JWT authentication with Passport.js (replaces Supabase Auth)
- RESTful API with Swagger documentation
- Gradual migration strategy (parallel backend during transition)

---

## Phase 1: Project Setup and Configuration

**Duration:** 1-2 days

### 1.1 Initialize NestJS Project

```bash
# Create backend directory alongside frontend
cd /Users/minhbohung111/workspace/projects/staffEvaluation
nest new backend --strict --package-manager npm
cd backend
```

### 1.2 Project Structure

```
staffEvaluation/
├── peer-review-hub/          # Existing React frontend
│   └── src/
└── backend/                   # New NestJS backend
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── common/           # Shared utilities
    │   │   ├── decorators/
    │   │   │   ├── current-user.decorator.ts
    │   │   │   └── roles.decorator.ts
    │   │   ├── guards/
    │   │   │   ├── jwt-auth.guard.ts
    │   │   │   └── roles.guard.ts
    │   │   ├── filters/
    │   │   │   └── http-exception.filter.ts
    │   │   ├── interceptors/
    │   │   │   ├── transform.interceptor.ts
    │   │   │   └── logging.interceptor.ts
    │   │   ├── dto/
    │   │   │   └── pagination.dto.ts
    │   │   └── pipes/
    │   │       └── validation.pipe.ts
    │   ├── config/           # Configuration
    │   │   ├── config.module.ts
    │   │   ├── database.config.ts
    │   │   └── jwt.config.ts
    │   ├── prisma/           # Database
    │   │   ├── prisma.module.ts
    │   │   ├── prisma.service.ts
    │   │   └── schema.prisma
    │   ├── auth/             # Authentication module
    │   │   ├── auth.module.ts
    │   │   ├── auth.controller.ts
    │   │   ├── auth.service.ts
    │   │   ├── strategies/
    │   │   │   ├── jwt.strategy.ts
    │   │   │   └── local.strategy.ts
    │   │   └── dto/
    │   │       ├── login.dto.ts
    │   │       └── register.dto.ts
    │   ├── users/            # User management
    │   │   ├── users.module.ts
    │   │   ├── users.controller.ts
    │   │   ├── users.service.ts
    │   │   └── dto/
    │   ├── organization-units/
    │   │   ├── organization-units.module.ts
    │   │   ├── organization-units.controller.ts
    │   │   ├── organization-units.service.ts
    │   │   └── dto/
    │   ├── staff/
    │   │   ├── staff.module.ts
    │   │   ├── staff.controller.ts
    │   │   ├── staff.service.ts
    │   │   └── dto/
    │   ├── groups/
    │   │   ├── groups.module.ts
    │   │   ├── groups.controller.ts
    │   │   ├── groups.service.ts
    │   │   └── dto/
    │   ├── questions/
    │   │   ├── questions.module.ts
    │   │   ├── questions.controller.ts
    │   │   ├── questions.service.ts
    │   │   └── dto/
    │   ├── evaluations/
    │   │   ├── evaluations.module.ts
    │   │   ├── evaluations.controller.ts
    │   │   ├── evaluations.service.ts
    │   │   └── dto/
    │   └── reports/          # Business logic
    │       ├── reports.module.ts
    │       ├── reports.controller.ts
    │       └── reports.service.ts
    ├── test/
    │   ├── app.e2e-spec.ts
    │   └── jest-e2e.json
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    ├── .env
    ├── .env.example
    ├── nest-cli.json
    ├── package.json
    └── tsconfig.json
```

### 1.3 Install Dependencies

```bash
# Core dependencies
npm install @nestjs/config @nestjs/swagger swagger-ui-express
npm install @nestjs/passport passport passport-jwt passport-local
npm install @prisma/client class-validator class-transformer
npm install bcrypt argon2 helmet
npm install @nestjs/throttler

# Dev dependencies
npm install -D prisma @types/passport-jwt @types/passport-local @types/bcrypt
npm install -D @nestjs/testing jest @types/jest ts-jest supertest @types/supertest
```

### 1.4 Environment Configuration

**File:** `backend/.env.example`

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-token-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Application
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

---

## Phase 2: Database Layer (Prisma)

**Duration:** 2-3 days

### 2.1 Prisma Schema

**File:** `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Enums
enum AppRole {
  admin
  moderator
  user
}

enum Sex {
  MALE
  FEMALE
  OTHER
}

// Organization Units (Departments/Faculties)
model OrganizationUnit {
  id     Int     @id @default(autoincrement())
  name   String

  staff  Staff[]
  groups Group[]

  @@map("organizationunits")
}

// Staff Members
model Staff {
  id                 Int               @id @default(autoincrement())
  staffcode          String?           @unique
  name               String?
  birthday           DateTime?
  sex                Int?              // 0=Male, 1=Female
  mobile             String?
  emailh             String?           // Home email
  emails             String?           // School email
  academicdegree     String?
  academicrank       String?
  bidv               String?           // Bank account
  organizationunitid Int?

  organizationUnit   OrganizationUnit? @relation(fields: [organizationunitid], references: [id])
  profile            Profile?
  groups             Staff2Group[]
  reviewsGiven       Evaluation[]      @relation("Reviewer")
  reviewsReceived    Evaluation[]      @relation("Victim")

  @@map("staff")
}

// Groups (Evaluation Groups)
model Group {
  id                 Int               @id @default(autoincrement())
  name               String
  organizationunitid Int?

  organizationUnit   OrganizationUnit? @relation(fields: [organizationunitid], references: [id])
  members            Staff2Group[]
  evaluations        Evaluation[]
  subjects           Subject[]

  @@map("groups")
}

// Staff to Group (Many-to-Many)
model Staff2Group {
  id      Int   @id @default(autoincrement())
  staffid Int
  groupid Int

  staff   Staff @relation(fields: [staffid], references: [id], onDelete: Cascade)
  group   Group @relation(fields: [groupid], references: [id], onDelete: Cascade)

  @@unique([staffid, groupid])
  @@map("staff2groups")
}

// Questions (Evaluation Criteria)
model Question {
  id          Int          @id @default(autoincrement())
  title       String
  description String?

  evaluations Evaluation[]

  @@map("questions")
}

// Evaluations (Peer Review Scores)
model Evaluation {
  id           Int       @id @default(autoincrement())
  reviewerid   Int?
  victimid     Int?
  questionid   Int?
  groupid      Int?
  point        Int?
  modifieddate DateTime? @default(now())

  reviewer     Staff?    @relation("Reviewer", fields: [reviewerid], references: [id])
  victim       Staff?    @relation("Victim", fields: [victimid], references: [id])
  question     Question? @relation(fields: [questionid], references: [id])
  group        Group?    @relation(fields: [groupid], references: [id])

  @@unique([reviewerid, victimid, questionid, groupid])
  @@map("evaluations")
}

// Subjects (Teaching subjects per group)
model Subject {
  id        Int     @id @default(autoincrement())
  subjectid String?
  name      String?
  groupid   Int?

  group     Group?  @relation(fields: [groupid], references: [id])

  @@map("subjects")
}

// User Profiles (Links auth users to staff)
model Profile {
  id         String    @id @default(uuid())
  staff_id   Int?      @unique
  created_at DateTime? @default(now())
  updated_at DateTime? @updatedAt

  // Auth fields (migrated from Supabase Auth)
  email           String    @unique
  password_hash   String
  email_confirmed Boolean   @default(false)

  staff      Staff?     @relation(fields: [staff_id], references: [id])
  roles      UserRole[]

  @@map("profiles")
}

// User Roles (RBAC)
model UserRole {
  id         String    @id @default(uuid())
  user_id    String
  role       AppRole
  created_at DateTime? @default(now())

  user       Profile   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, role])
  @@map("user_roles")
}
```

### 2.2 Prisma Service

**File:** `backend/src/prisma/prisma.service.ts`

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

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    // For testing - truncate in correct order
    await this.$transaction([
      this.evaluation.deleteMany(),
      this.staff2Group.deleteMany(),
      this.subject.deleteMany(),
      this.userRole.deleteMany(),
      this.profile.deleteMany(),
      this.staff.deleteMany(),
      this.question.deleteMany(),
      this.group.deleteMany(),
      this.organizationUnit.deleteMany(),
    ]);
  }
}
```

### 2.3 Database Migration Strategy

**Option A: Introspect Existing (Recommended)**
```bash
# Pull existing schema from Supabase
npx prisma db pull

# Generate client
npx prisma generate
```

**Option B: Fresh Migration**
```bash
# Create migration from schema
npx prisma migrate dev --name init

# Apply to production
npx prisma migrate deploy
```

---

## Phase 3: Authentication Module

**Duration:** 2-3 days

### 3.1 Auth DTOs

**File:** `backend/src/auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    email: string;
    staffId: number | null;
    roles: string[];
  };
}
```

### 3.2 Auth Service

**File:** `backend/src/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user exists
    const existing = await this.prisma.profile.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user with default role
    const user = await this.prisma.profile.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        roles: {
          create: { role: 'user' },
        },
      },
      include: { roles: true },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.profile.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await argon2.verify(user.password_hash, dto.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.profile.findUnique({
        where: { id: payload.sub },
        include: { roles: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: any): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      staffId: user.staff_id,
      roles: user.roles.map((r: any) => r.role),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        staffId: user.staff_id,
        roles: user.roles.map((r: any) => r.role),
      },
    };
  }
}
```

### 3.3 JWT Strategy

**File:** `backend/src/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  staffId: number | null;
  roles: string[];
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
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.profile.findUnique({
      where: { id: payload.sub },
      include: { roles: true, staff: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      staffId: user.staff_id,
      staff: user.staff,
      roles: user.roles.map((r) => r.role),
    };
  }
}
```

### 3.4 Auth Guards

**File:** `backend/src/common/guards/roles.guard.ts`

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

**File:** `backend/src/common/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { AppRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
```

---

## Phase 4: Core Modules (CRUD)

**Duration:** 4-5 days

### 4.1 Organization Units Module

**File:** `backend/src/organization-units/organization-units.controller.ts`

```typescript
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe, HttpStatus, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationUnitsService } from './organization-units.service';
import { CreateOrganizationUnitDto, UpdateOrganizationUnitDto } from './dto';

@ApiTags('Organization Units')
@ApiBearerAuth()
@Controller('api/v1/organization-units')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationUnitsController {
  constructor(private readonly service: OrganizationUnitsService) {}

  @Get()
  @ApiOperation({ summary: 'List all organization units' })
  findAll(@Query('include') include?: string) {
    return this.service.findAll({ include });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization unit by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create organization unit (Admin only)' })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Body() dto: CreateOrganizationUnitDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update organization unit (Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrganizationUnitDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization unit (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
```

### 4.2 Staff Module

**File:** `backend/src/staff/dto/create-staff.dto.ts`

```typescript
import { IsString, IsOptional, IsInt, IsEmail, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  staffcode?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  birthday?: string;

  @ApiPropertyOptional({ enum: [0, 1], description: '0=Male, 1=Female' })
  @IsInt()
  @IsOptional()
  sex?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  emailh?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  emails?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicdegree?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicrank?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  organizationunitid?: number;
}
```

**File:** `backend/src/staff/staff.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto, StaffQueryDto } from './dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: StaffQueryDto) {
    const { page = 1, limit = 50, organizationunitid, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (organizationunitid) {
      where.organizationunitid = organizationunitid;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { staffcode: { contains: search, mode: 'insensitive' } },
        { emails: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        include: {
          organizationUnit: true,
          groups: { include: { group: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        organizationUnit: true,
        groups: { include: { group: true } },
        reviewsGiven: { include: { victim: true, question: true } },
        reviewsReceived: { include: { reviewer: true, question: true } },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return staff;
  }

  async create(dto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: dto,
      include: { organizationUnit: true },
    });
  }

  async update(id: number, dto: UpdateStaffDto) {
    await this.findOne(id); // Ensure exists
    return this.prisma.staff.update({
      where: { id },
      data: dto,
      include: { organizationUnit: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.staff.delete({ where: { id } });
  }

  async assignToGroup(staffId: number, groupId: number) {
    return this.prisma.staff2Group.create({
      data: { staffid: staffId, groupid: groupId },
    });
  }

  async removeFromGroup(staffId: number, groupId: number) {
    return this.prisma.staff2Group.deleteMany({
      where: { staffid: staffId, groupid: groupId },
    });
  }
}
```

### 4.3 Evaluations Module (Core Business Logic)

**File:** `backend/src/evaluations/evaluations.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationDto, BulkEvaluationDto } from './dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEvaluationDto, reviewerId: number) {
    // Validate: Cannot evaluate self
    if (dto.victimid === reviewerId) {
      throw new BadRequestException('Cannot evaluate yourself');
    }

    // Validate: Both must be in same group
    const [reviewerGroups, victimGroups] = await Promise.all([
      this.prisma.staff2Group.findMany({ where: { staffid: reviewerId } }),
      this.prisma.staff2Group.findMany({ where: { staffid: dto.victimid } }),
    ]);

    const reviewerGroupIds = reviewerGroups.map((g) => g.groupid);
    const victimGroupIds = victimGroups.map((g) => g.groupid);
    const commonGroups = reviewerGroupIds.filter((id) => victimGroupIds.includes(id));

    if (!commonGroups.includes(dto.groupid)) {
      throw new ForbiddenException('You can only evaluate members of your group');
    }

    // Validate point range (1-10)
    if (dto.point < 1 || dto.point > 10) {
      throw new BadRequestException('Point must be between 1 and 10');
    }

    // Upsert evaluation
    return this.prisma.evaluation.upsert({
      where: {
        reviewerid_victimid_questionid_groupid: {
          reviewerid: reviewerId,
          victimid: dto.victimid,
          questionid: dto.questionid,
          groupid: dto.groupid,
        },
      },
      update: {
        point: dto.point,
        modifieddate: new Date(),
      },
      create: {
        reviewerid: reviewerId,
        victimid: dto.victimid,
        questionid: dto.questionid,
        groupid: dto.groupid,
        point: dto.point,
      },
      include: {
        reviewer: true,
        victim: true,
        question: true,
      },
    });
  }

  async bulkCreate(dto: BulkEvaluationDto, reviewerId: number) {
    const results = await Promise.all(
      dto.evaluations.map((e) =>
        this.create(
          {
            victimid: e.victimid,
            questionid: e.questionid,
            groupid: dto.groupid,
            point: e.point,
          },
          reviewerId,
        ),
      ),
    );
    return results;
  }

  async getEvaluationsByGroup(groupId: number) {
    return this.prisma.evaluation.findMany({
      where: { groupid: groupId },
      include: {
        reviewer: { select: { id: true, name: true } },
        victim: { select: { id: true, name: true } },
        question: true,
      },
    });
  }

  async getMyEvaluations(reviewerId: number, groupId?: number) {
    const where: any = { reviewerid: reviewerId };
    if (groupId) where.groupid = groupId;

    return this.prisma.evaluation.findMany({
      where,
      include: {
        victim: { select: { id: true, name: true } },
        question: true,
        group: { select: { id: true, name: true } },
      },
    });
  }

  async getEvaluationsForStaff(staffId: number, groupId?: number) {
    const where: any = { victimid: staffId };
    if (groupId) where.groupid = groupId;

    return this.prisma.evaluation.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true } },
        question: true,
        group: { select: { id: true, name: true } },
      },
    });
  }
}
```

### 4.4 Groups Module

**File:** `backend/src/groups/groups.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, AddMembersDto } from './dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationunitid?: number) {
    const where = organizationunitid ? { organizationunitid } : {};

    return this.prisma.group.findMany({
      where,
      include: {
        organizationUnit: true,
        members: {
          include: {
            staff: { select: { id: true, name: true, staffcode: true } },
          },
        },
        _count: { select: { members: true, evaluations: true } },
      },
    });
  }

  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        organizationUnit: true,
        members: {
          include: {
            staff: {
              select: {
                id: true,
                name: true,
                staffcode: true,
                emails: true,
                academicdegree: true,
              },
            },
          },
        },
        subjects: true,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  async create(dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        name: dto.name,
        organizationunitid: dto.organizationunitid,
      },
      include: { organizationUnit: true },
    });
  }

  async addMembers(groupId: number, dto: AddMembersDto) {
    await this.findOne(groupId);

    const data = dto.staffIds.map((staffid) => ({
      staffid,
      groupid: groupId,
    }));

    await this.prisma.staff2Group.createMany({
      data,
      skipDuplicates: true,
    });

    return this.findOne(groupId);
  }

  async removeMembers(groupId: number, staffIds: number[]) {
    await this.prisma.staff2Group.deleteMany({
      where: {
        groupid: groupId,
        staffid: { in: staffIds },
      },
    });

    return this.findOne(groupId);
  }

  async getGroupMembers(groupId: number) {
    return this.prisma.staff2Group.findMany({
      where: { groupid: groupId },
      include: {
        staff: {
          include: { organizationUnit: true },
        },
      },
    });
  }
}
```

---

## Phase 5: Reports Module (Business Logic)

**Duration:** 2-3 days

### 5.1 Reports Service

**File:** `backend/src/reports/reports.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StaffScore {
  staffId: number;
  staffName: string;
  averageScore: number;
  totalEvaluations: number;
  scoresByQuestion: Record<number, number>;
}

interface GroupReport {
  groupId: number;
  groupName: string;
  staffScores: StaffScore[];
  questionAverages: Record<number, number>;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getGroupReport(groupId: number): Promise<GroupReport> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { staff: true } },
        evaluations: {
          include: {
            question: true,
            victim: true,
          },
        },
      },
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    // Calculate scores per staff member
    const staffScores: StaffScore[] = group.members.map((member) => {
      const evaluations = group.evaluations.filter(
        (e) => e.victimid === member.staffid,
      );

      const scoresByQuestion: Record<number, number> = {};
      const questionCounts: Record<number, number> = {};

      evaluations.forEach((e) => {
        if (e.questionid && e.point) {
          if (!scoresByQuestion[e.questionid]) {
            scoresByQuestion[e.questionid] = 0;
            questionCounts[e.questionid] = 0;
          }
          scoresByQuestion[e.questionid] += e.point;
          questionCounts[e.questionid]++;
        }
      });

      // Calculate averages per question
      Object.keys(scoresByQuestion).forEach((qId) => {
        scoresByQuestion[+qId] = scoresByQuestion[+qId] / questionCounts[+qId];
      });

      const totalPoints = evaluations.reduce((sum, e) => sum + (e.point || 0), 0);
      const averageScore = evaluations.length > 0 ? totalPoints / evaluations.length : 0;

      return {
        staffId: member.staffid,
        staffName: member.staff.name || 'Unknown',
        averageScore: Math.round(averageScore * 100) / 100,
        totalEvaluations: evaluations.length,
        scoresByQuestion,
      };
    });

    // Calculate question averages for entire group
    const questionAverages: Record<number, number> = {};
    const questionTotals: Record<number, { sum: number; count: number }> = {};

    group.evaluations.forEach((e) => {
      if (e.questionid && e.point) {
        if (!questionTotals[e.questionid]) {
          questionTotals[e.questionid] = { sum: 0, count: 0 };
        }
        questionTotals[e.questionid].sum += e.point;
        questionTotals[e.questionid].count++;
      }
    });

    Object.keys(questionTotals).forEach((qId) => {
      const { sum, count } = questionTotals[+qId];
      questionAverages[+qId] = Math.round((sum / count) * 100) / 100;
    });

    return {
      groupId: group.id,
      groupName: group.name,
      staffScores: staffScores.sort((a, b) => b.averageScore - a.averageScore),
      questionAverages,
    };
  }

  async getStaffReport(staffId: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        reviewsReceived: {
          include: {
            reviewer: { select: { id: true, name: true } },
            question: true,
            group: { select: { id: true, name: true } },
          },
        },
        groups: { include: { group: true } },
      },
    });

    if (!staff) {
      throw new Error(`Staff ${staffId} not found`);
    }

    // Aggregate by group
    const byGroup = staff.groups.map((g) => {
      const groupEvals = staff.reviewsReceived.filter(
        (e) => e.groupid === g.groupid,
      );

      const avgScore =
        groupEvals.length > 0
          ? groupEvals.reduce((sum, e) => sum + (e.point || 0), 0) / groupEvals.length
          : 0;

      return {
        groupId: g.groupid,
        groupName: g.group.name,
        averageScore: Math.round(avgScore * 100) / 100,
        evaluationCount: groupEvals.length,
      };
    });

    // Overall average
    const overallAvg =
      staff.reviewsReceived.length > 0
        ? staff.reviewsReceived.reduce((sum, e) => sum + (e.point || 0), 0) /
          staff.reviewsReceived.length
        : 0;

    return {
      staffId: staff.id,
      staffName: staff.name,
      overallAverageScore: Math.round(overallAvg * 100) / 100,
      totalEvaluations: staff.reviewsReceived.length,
      byGroup,
    };
  }

  async getEvaluationMatrix(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { staff: { select: { id: true, name: true } } } },
        evaluations: true,
      },
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const members = group.members.map((m) => m.staff);
    const matrix: Record<number, Record<number, number | null>> = {};

    // Initialize matrix
    members.forEach((reviewer) => {
      matrix[reviewer.id] = {};
      members.forEach((victim) => {
        matrix[reviewer.id][victim.id] = null;
      });
    });

    // Fill with average scores (across all questions)
    const evalsByPair: Record<string, number[]> = {};
    group.evaluations.forEach((e) => {
      if (e.reviewerid && e.victimid && e.point) {
        const key = `${e.reviewerid}-${e.victimid}`;
        if (!evalsByPair[key]) evalsByPair[key] = [];
        evalsByPair[key].push(e.point);
      }
    });

    Object.entries(evalsByPair).forEach(([key, points]) => {
      const [reviewerId, victimId] = key.split('-').map(Number);
      const avg = points.reduce((a, b) => a + b, 0) / points.length;
      if (matrix[reviewerId]) {
        matrix[reviewerId][victimId] = Math.round(avg * 100) / 100;
      }
    });

    return {
      members,
      matrix,
    };
  }
}
```

---

## Phase 6: API Documentation (Swagger)

**Duration:** 1 day

### 6.1 Swagger Setup

**File:** `backend/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Staff Evaluation API')
    .setDescription('Peer Review Hub Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('organization-units', 'Department/Faculty management')
    .addTag('staff', 'Staff member management')
    .addTag('groups', 'Evaluation group management')
    .addTag('questions', 'Evaluation criteria management')
    .addTag('evaluations', 'Peer review evaluations')
    .addTag('reports', 'Reports and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
```

---

## Phase 7: Testing Strategy

**Duration:** 3-4 days

### 7.1 Test Structure

```
backend/
├── src/
│   └── [module]/
│       ├── [module].service.spec.ts    # Unit tests
│       └── [module].controller.spec.ts # Controller tests
├── test/
│   ├── app.e2e-spec.ts                 # E2E tests
│   ├── auth.e2e-spec.ts
│   ├── evaluations.e2e-spec.ts
│   └── jest-e2e.json
```

### 7.2 Unit Test Example

**File:** `backend/src/evaluations/evaluations.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationsService } from './evaluations.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    staff2Group: {
      findMany: jest.fn(),
    },
    evaluation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw if evaluating self', async () => {
      await expect(
        service.create({ victimid: 1, questionid: 1, groupid: 1, point: 5 }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if not in same group', async () => {
      mockPrismaService.staff2Group.findMany
        .mockResolvedValueOnce([{ groupid: 1 }])  // reviewer groups
        .mockResolvedValueOnce([{ groupid: 2 }]); // victim groups

      await expect(
        service.create({ victimid: 2, questionid: 1, groupid: 1, point: 5 }, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if point out of range', async () => {
      mockPrismaService.staff2Group.findMany
        .mockResolvedValueOnce([{ groupid: 1 }])
        .mockResolvedValueOnce([{ groupid: 1 }]);

      await expect(
        service.create({ victimid: 2, questionid: 1, groupid: 1, point: 15 }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create evaluation successfully', async () => {
      mockPrismaService.staff2Group.findMany
        .mockResolvedValueOnce([{ groupid: 1 }])
        .mockResolvedValueOnce([{ groupid: 1 }]);

      mockPrismaService.evaluation.upsert.mockResolvedValue({
        id: 1,
        reviewerid: 1,
        victimid: 2,
        questionid: 1,
        groupid: 1,
        point: 8,
      });

      const result = await service.create(
        { victimid: 2, questionid: 1, groupid: 1, point: 8 },
        1,
      );

      expect(result.point).toBe(8);
    });
  });
});
```

### 7.3 E2E Test Example

**File:** `backend/test/auth.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.email).toBe('test@example.com');
        });
    });

    it('should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });
    });

    it('should login successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword123',
        })
        .expect(401);
    });
  });
});
```

---

## Phase 8: Migration Strategy

**Duration:** 3-4 days (parallel testing)

### 8.1 Migration Approach: Parallel Backend

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ useSupabase.ts  │    │ useNestAPI.ts   │                │
│  │ (current)       │    │ (new)           │                │
│  └────────┬────────┘    └────────┬────────┘                │
└───────────┼─────────────────────┼──────────────────────────┘
            │                      │
            ▼                      ▼
     ┌──────────────┐       ┌──────────────┐
     │   Supabase   │       │   NestJS     │
     │   Backend    │       │   Backend    │
     └──────┬───────┘       └──────┬───────┘
            │                      │
            └──────────┬───────────┘
                       ▼
              ┌────────────────┐
              │  PostgreSQL    │
              │  (Supabase)    │
              └────────────────┘
```

### 8.2 Frontend API Client Migration

**Step 1:** Create NestJS API client

**File:** `peer-review-hub/src/lib/api-client.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
      }
    }

    return Promise.reject(error);
  }
);
```

**Step 2:** Create feature flag for backend switch

**File:** `peer-review-hub/src/lib/feature-flags.ts`

```typescript
export const FEATURES = {
  USE_NESTJS_BACKEND: import.meta.env.VITE_USE_NESTJS === 'true',
};
```

**Step 3:** Create hybrid hooks

**File:** `peer-review-hub/src/hooks/useStaffHybrid.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api-client';
import { FEATURES } from '@/lib/feature-flags';

export function useStaff() {
  const queryClient = useQueryClient();

  const fetchStaff = async () => {
    if (FEATURES.USE_NESTJS_BACKEND) {
      const { data } = await apiClient.get('/api/v1/staff');
      return data;
    } else {
      const { data, error } = await supabase
        .from('staff')
        .select('*, organizationunits(*)');
      if (error) throw error;
      return { data, pagination: null };
    }
  };

  return useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
  });
}
```

### 8.3 Auth Migration

**Step 1:** Migrate existing Supabase users to NestJS

```typescript
// Migration script: scripts/migrate-users.ts
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);
const prisma = new PrismaClient();

async function migrateUsers() {
  // Get all Supabase auth users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) throw error;

  for (const user of users) {
    // Get profile and roles
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, user_roles(*)')
      .eq('id', user.id)
      .single();

    // Create in NestJS database
    await prisma.profile.create({
      data: {
        id: user.id,
        email: user.email!,
        password_hash: await argon2.hash('NEEDS_RESET'), // Force password reset
        email_confirmed: user.email_confirmed_at !== null,
        staff_id: profile?.staff_id,
        roles: {
          createMany: {
            data: profile?.user_roles?.map((r: any) => ({
              role: r.role,
            })) || [{ role: 'user' }],
          },
        },
      },
    });

    console.log(`Migrated user: ${user.email}`);
  }

  console.log('Migration complete!');
}

migrateUsers();
```

### 8.4 Migration Checklist

- [ ] **Phase A: Setup**
  - [ ] NestJS project initialized
  - [ ] Prisma schema matches Supabase
  - [ ] Environment variables configured
  - [ ] Auth module complete with JWT

- [ ] **Phase B: API Parity**
  - [ ] All CRUD endpoints implemented
  - [ ] Response format matches frontend expectations
  - [ ] Error handling consistent
  - [ ] Swagger documentation complete

- [ ] **Phase C: Testing**
  - [ ] Unit tests pass (>80% coverage)
  - [ ] E2E tests pass
  - [ ] Manual testing complete
  - [ ] Performance benchmarks acceptable

- [ ] **Phase D: Frontend Integration**
  - [ ] API client created
  - [ ] Feature flag for backend switch
  - [ ] Hybrid hooks tested
  - [ ] Auth flow works with NestJS

- [ ] **Phase E: User Migration**
  - [ ] User migration script tested
  - [ ] Password reset flow ready
  - [ ] Role mapping verified
  - [ ] Staff-profile links preserved

- [ ] **Phase F: Cutover**
  - [ ] Feature flag enabled in production
  - [ ] Monitor error rates
  - [ ] Rollback plan ready
  - [ ] Remove Supabase dependencies (after stability confirmed)

---

## Phase 9: API Endpoints Summary

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login user | Public |
| POST | `/auth/refresh` | Refresh tokens | Public |
| POST | `/auth/logout` | Logout user | JWT |
| GET | `/auth/me` | Get current user | JWT |

### Organization Units

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/organization-units` | List all units | JWT |
| GET | `/api/v1/organization-units/:id` | Get unit by ID | JWT |
| POST | `/api/v1/organization-units` | Create unit | Admin |
| PUT | `/api/v1/organization-units/:id` | Update unit | Admin |
| DELETE | `/api/v1/organization-units/:id` | Delete unit | Admin |

### Staff

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/staff` | List staff (paginated) | JWT |
| GET | `/api/v1/staff/:id` | Get staff by ID | JWT |
| POST | `/api/v1/staff` | Create staff | Admin |
| PUT | `/api/v1/staff/:id` | Update staff | Admin |
| DELETE | `/api/v1/staff/:id` | Delete staff | Admin |
| POST | `/api/v1/staff/:id/groups/:groupId` | Assign to group | Admin |
| DELETE | `/api/v1/staff/:id/groups/:groupId` | Remove from group | Admin |

### Groups

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/groups` | List groups | JWT |
| GET | `/api/v1/groups/:id` | Get group with members | JWT |
| POST | `/api/v1/groups` | Create group | Admin |
| PUT | `/api/v1/groups/:id` | Update group | Admin |
| DELETE | `/api/v1/groups/:id` | Delete group | Admin |
| POST | `/api/v1/groups/:id/members` | Add members | Admin |
| DELETE | `/api/v1/groups/:id/members` | Remove members | Admin |

### Questions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/questions` | List questions | JWT |
| GET | `/api/v1/questions/:id` | Get question | JWT |
| POST | `/api/v1/questions` | Create question | Admin |
| PUT | `/api/v1/questions/:id` | Update question | Admin |
| DELETE | `/api/v1/questions/:id` | Delete question | Admin |

### Evaluations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/evaluations` | Create evaluation | JWT |
| POST | `/api/v1/evaluations/bulk` | Bulk create | JWT |
| GET | `/api/v1/evaluations/my` | My evaluations | JWT |
| GET | `/api/v1/evaluations/received` | Evaluations I received | JWT |
| GET | `/api/v1/evaluations/group/:groupId` | Group evaluations | JWT+Moderator |

### Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/reports/group/:groupId` | Group report | JWT+Moderator |
| GET | `/api/v1/reports/staff/:staffId` | Staff report | JWT+Moderator |
| GET | `/api/v1/reports/matrix/:groupId` | Evaluation matrix | JWT+Moderator |
| GET | `/api/v1/reports/export/:groupId` | Export to Excel | JWT+Moderator |

---

## Phase 10: Deployment

**Duration:** 1-2 days

### 10.1 Docker Configuration

**File:** `backend/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main"]
```

**File:** `docker-compose.yml`

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=staffevaluation
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 10.2 CI/CD (GitHub Actions)

**File:** `.github/workflows/backend.yml`

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run test:cov
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          JWT_SECRET: test-secret-key-for-testing-only
          JWT_REFRESH_SECRET: test-refresh-secret

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest
```

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Project Setup | 1-2 days | - |
| 2. Database Layer | 2-3 days | Phase 1 |
| 3. Authentication | 2-3 days | Phase 2 |
| 4. Core Modules | 4-5 days | Phase 3 |
| 5. Reports Module | 2-3 days | Phase 4 |
| 6. API Documentation | 1 day | Phase 4 |
| 7. Testing | 3-4 days | Phase 5 |
| 8. Migration | 3-4 days | Phase 7 |
| 9. Deployment | 1-2 days | Phase 8 |

**Total Estimated Duration:** 20-27 days

---

## Resolved Decisions

1. **Database Hosting:** Local PostgreSQL (development) - can migrate to cloud later
2. **Auth Transition:** Keep current flow (password reset on migration)
3. **File Storage:** Keep current (no changes needed)
4. **Rate Limiting:** Default NestJS throttler settings
5. **Audit Logging:** Not required for now
6. **WebSockets:** Not required for now

---

## Local Development Setup

### PostgreSQL via Docker

```bash
# Start local PostgreSQL
docker run -d \
  --name staffeval-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=staffevaluation \
  -p 5432:5432 \
  postgres:16-alpine

# Connection string for .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/staffevaluation"
```

### Or using mise (if installed)

```bash
# Install PostgreSQL via mise
mise use postgres@16
```
