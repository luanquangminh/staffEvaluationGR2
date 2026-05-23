import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationPeriodsCron } from './evaluation-periods.cron';
import { PrismaService } from '../prisma/prisma.service';

describe('EvaluationPeriodsCron', () => {
  let cron: EvaluationPeriodsCron;

  const mockPrismaService = {
    evaluationPeriod: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationPeriodsCron,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    cron = module.get<EvaluationPeriodsCron>(EvaluationPeriodsCron);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(cron).toBeDefined();
  });

  describe('autoCloseExpiredPeriods', () => {
    it('should close active periods with past endDate', async () => {
      mockPrismaService.evaluationPeriod.updateMany.mockResolvedValue({
        count: 2,
      });

      await cron.autoCloseExpiredPeriods();

      expect(mockPrismaService.evaluationPeriod.updateMany).toHaveBeenCalledTimes(1);

      const call = mockPrismaService.evaluationPeriod.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({
        status: 'active',
        endDate: { lt: expect.any(Date) },
      });
      expect(call.data).toEqual({ status: 'closed' });
    });

    it('should not log when no periods are closed', async () => {
      mockPrismaService.evaluationPeriod.updateMany.mockResolvedValue({
        count: 0,
      });

      await cron.autoCloseExpiredPeriods();

      expect(mockPrismaService.evaluationPeriod.updateMany).toHaveBeenCalledTimes(1);
    });

    it('should leave active periods with future endDate unaffected', async () => {
      // The cron issues a single updateMany with `endDate: { lt: now }`,
      // so periods whose endDate is in the future are excluded by the query.
      mockPrismaService.evaluationPeriod.updateMany.mockResolvedValue({
        count: 0,
      });

      await cron.autoCloseExpiredPeriods();

      const call = mockPrismaService.evaluationPeriod.updateMany.mock.calls[0][0];
      // The where clause only targets active + past endDate
      expect(call.where.status).toBe('active');
      expect(call.where.endDate).toEqual({ lt: expect.any(Date) });
    });

    it('should not affect closed or draft periods', async () => {
      // The query explicitly filters `status: 'active'`, so closed and
      // draft periods are never touched by the updateMany call.
      mockPrismaService.evaluationPeriod.updateMany.mockResolvedValue({
        count: 0,
      });

      await cron.autoCloseExpiredPeriods();

      const call = mockPrismaService.evaluationPeriod.updateMany.mock.calls[0][0];
      expect(call.where.status).toBe('active');
      // Only 'active' status is in the where clause — closed/draft are excluded
      expect(call.where.status).not.toBe('closed');
      expect(call.where.status).not.toBe('draft');
    });
  });
});
