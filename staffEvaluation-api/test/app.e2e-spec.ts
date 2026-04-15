/**
 * End-to-end tests covering the HTTP layer: auth flow, guards, validation pipe,
 * and the Prisma exception filter. Prisma is mocked so tests are fast and
 * hermetic — we don't exercise the DB engine here, we exercise the app shell.
 *
 * Real-DB integration tests would require a dedicated test database and live
 * outside this stub (see docs/solidfix.md — optional future work).
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

// Minimal in-memory Prisma stub — each test configures return values per-call
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  staff: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  profile: { update: jest.fn() },
  group: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
};

describe('API (e2e, mocked Prisma)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let jwtSecret: string;

  beforeAll(async () => {
    // NODE_ENV=test makes ThrottlerModule skip rate limiting (see app.module.ts).
    // JWT_SECRET is read from the repo .env via ConfigModule — we align signToken
    // against whatever ConfigService actually resolves, so this suite doesn't
    // depend on a specific test-secret value.
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
    jwtService = moduleRef.get<JwtService>(JwtService);
    const configService = moduleRef.get<ConfigService>(ConfigService);
    jwtSecret = configService.get<string>('JWT_SECRET') as string;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.staff.findMany.mockResolvedValue([]);
    prismaMock.staff.count.mockResolvedValue(0);
    prismaMock.group.findMany.mockResolvedValue([]);
    prismaMock.group.count.mockResolvedValue(0);
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);
  });

  const signToken = (payload: Record<string, unknown>) =>
    jwtService.sign(payload, { secret: jwtSecret });

  describe('GET /health', () => {
    it('returns 200 when DB ping succeeds', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('POST /auth/register — validation pipe', () => {
    it('rejects short passwords with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('at least 8 characters');
    });

    it('rejects passwords without uppercase/digit with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: 'alllowercase' });
      expect(res.status).toBe(400);
    });

    it('rejects unknown fields (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.com', password: 'Password123', isAdmin: true });
      expect(res.status).toBe(400);
    });

    it('rejects invalid email with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Password123' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 401 when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nope@b.com', password: 'Password123' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('returns 401 for OAuth-only accounts attempting password login', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'oauth@b.com',
        passwordHash: null,
        provider: 'microsoft',
        profile: null,
        roles: [],
      });
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'oauth@b.com', password: 'Password123' });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Microsoft sign-in');
    });

    it('returns 200 with tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'ok@b.com',
        passwordHash,
        profile: { staffId: 1 },
        roles: [{ role: 'user' }],
      });
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ok@b.com', password: 'Password123' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('ok@b.com');
    });
  });

  describe('GET /groups — auth + role guard', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get('/groups');
      expect(res.status).toBe(401);
    });

    it('returns 403 for authenticated non-admin users (RolesGuard + BE-2)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@b.com',
        profile: { staffId: 1 },
        roles: [{ role: 'user' }],
      });
      const token = signToken({ sub: 'u1', email: 'u@b.com', roles: ['user'], staffId: 1 });
      const res = await request(app.getHttpServer())
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('returns 200 for admin users', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@b.com',
        profile: null,
        roles: [{ role: 'admin' }],
      });
      prismaMock.group.findMany.mockResolvedValue([
        { id: 1, name: 'Group A', organizationUnit: null },
      ]);
      const token = signToken({ sub: 'a1', email: 'admin@b.com', roles: ['admin'], staffId: null });
      const res = await request(app.getHttpServer())
        .get('/groups')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PrismaExceptionFilter integration', () => {
    it('maps P2025 (record not found) to 404', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'a1',
        email: 'admin@b.com',
        profile: null,
        roles: [{ role: 'admin' }],
      });
      prismaMock.group.findUnique.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );
      const token = signToken({ sub: 'a1', email: 'admin@b.com', roles: ['admin'] });
      const res = await request(app.getHttpServer())
        .get('/groups/999')
        .set('Authorization', `Bearer ${token}`);
      // Controller throws NotFoundException when findUnique returns null; but when
      // Prisma itself throws P2025, our filter catches it → 404.
      // Either path is acceptable here — both produce 404.
      expect([404]).toContain(res.status);
    });
  });
});
