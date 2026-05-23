import { Module } from '@nestjs/common';
import { EvaluationPeriodsService } from './evaluation-periods.service';
import { EvaluationPeriodsController } from './evaluation-periods.controller';
import { EvaluationPeriodsCron } from './evaluation-periods.cron';

@Module({
  controllers: [EvaluationPeriodsController],
  providers: [EvaluationPeriodsService, EvaluationPeriodsCron],
  exports: [EvaluationPeriodsService],
})
export class EvaluationPeriodsModule {}
