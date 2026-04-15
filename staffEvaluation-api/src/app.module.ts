import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { GroupsModule } from './groups/groups.module';
import { QuestionsModule } from './questions/questions.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { OrganizationUnitsModule } from './organization-units/organization-units.module';
import { UsersModule } from './users/users.module';
import { EvaluationPeriodsModule } from './evaluation-periods/evaluation-periods.module';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        validateEnv(config as NodeJS.ProcessEnv);
        return config;
      },
    }),
    ThrottlerModule.forRoot({
      // Skip throttling in tests — real-DB / fast-iteration suites should not
      // hit rate limits. Production behavior is unchanged.
      skipIf: () => process.env.NODE_ENV === 'test',
      throttlers: [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 20,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    StaffModule,
    GroupsModule,
    QuestionsModule,
    EvaluationsModule,
    EvaluationPeriodsModule,
    OrganizationUnitsModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    // Apply ThrottlerGuard globally. Per-endpoint @Throttle() overrides still work.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
