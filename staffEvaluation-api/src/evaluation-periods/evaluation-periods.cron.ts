import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvaluationPeriodsCron {
  private readonly logger = new Logger(EvaluationPeriodsCron.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs every 5 minutes: auto-close active periods whose endDate has passed.
   * Does NOT auto-activate draft periods — that remains an admin decision.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoCloseExpiredPeriods() {
    const now = new Date();

    const result = await this.prisma.evaluationPeriod.updateMany({
      where: {
        status: 'active',
        endDate: { lt: now },
      },
      data: { status: 'closed' },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-closed ${result.count} expired evaluation period(s)`);
    }
  }
}
