import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger, BadRequestException, ValidationError } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Security headers with Helmet — relaxed for Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Enable CORS with environment-based origins
  const isProduction = process.env.NODE_ENV === 'production';
  let corsOrigins: string[];
  if (process.env.CORS_ORIGINS) {
    corsOrigins = process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
  } else if (isProduction) {
    throw new Error('CORS_ORIGINS must be set in production. Example: CORS_ORIGINS=https://example.com');
  } else {
    corsOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve uploaded files (avatars, etc.)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // Global exception filters — order matters: specific (Prisma) before catch-all (Http)
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Request body size limit (prevent OOM from large payloads)
  app.use(require('express').json({ limit: '100kb' }));
  app.use(require('express').urlencoded({ limit: '100kb', extended: true }));

  // Global validation pipe
  // FE-5: `exceptionFactory` emits field-level errors so the frontend can
  // surface inline validation on the offending field instead of a generic
  // toast. Shape: { statusCode, message, error, fields: { email: [...] } }.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const fields: Record<string, string[]> = {};
        const walk = (errs: ValidationError[], prefix = '') => {
          for (const err of errs) {
            const path = prefix ? `${prefix}.${err.property}` : err.property;
            if (err.constraints) {
              fields[path] = Object.values(err.constraints);
            }
            if (err.children && err.children.length > 0) {
              walk(err.children, path);
            }
          }
        };
        walk(errors);
        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
          fields,
        });
      },
    }),
  );

  const port = process.env.PORT ?? 3001;

  // Swagger documentation — only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Staff Evaluation Hub API')
      .setDescription('API for staff peer review evaluation system. Use the Authorize button with a Bearer token to test authenticated endpoints.')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & registration')
      .addTag('staff', 'Staff management (CRUD)')
      .addTag('groups', 'Group management & members')
      .addTag('evaluations', 'Peer evaluation submission & queries')
      .addTag('evaluation-periods', 'Evaluation period management')
      .addTag('questions', 'Evaluation criteria management')
      .addTag('organization-units', 'Department/Faculty management')
      .addTag('users', 'User profiles & role management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    logger.log(`Swagger docs available at: http://localhost:${port}/api`);
  }

  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
