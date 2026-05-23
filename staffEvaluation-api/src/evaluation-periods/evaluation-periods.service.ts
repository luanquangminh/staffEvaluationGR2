import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEvaluationPeriodDto, UpdateEvaluationPeriodDto } from './dto/evaluation-periods.dto';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class EvaluationPeriodsService {
  private readonly logger = new Logger(EvaluationPeriodsService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(pagination?: PaginationDto) {
    if (pagination?.page && pagination?.limit) {
      const { page, limit } = pagination;
      const [data, total] = await Promise.all([
        this.prisma.evaluationPeriod.findMany({
          orderBy: { startDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.evaluationPeriod.count(),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      } satisfies PaginatedResult<typeof data[number]>;
    }

    return this.prisma.evaluationPeriod.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const period = await this.prisma.evaluationPeriod.findUnique({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException(`Evaluation period with ID ${id} not found`);
    }

    return period;
  }

  async findActive() {
    return this.prisma.evaluationPeriod.findMany({
      where: { status: 'active' },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(dto: CreateEvaluationPeriodDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.evaluationPeriod.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate,
        endDate,
        isAnonymous: dto.isAnonymous ?? false,
      },
    });
  }

  async update(id: number, dto: UpdateEvaluationPeriodDto) {
    const period = await this.prisma.evaluationPeriod.findUnique({ where: { id } });

    if (!period) {
      throw new NotFoundException(`Evaluation period with ID ${id} not found`);
    }

    // Validate date range: resolve final start/end from dto + existing record
    const finalStartDate = dto.startDate ? new Date(dto.startDate) : period.startDate;
    const finalEndDate = dto.endDate ? new Date(dto.endDate) : period.endDate;
    if (finalEndDate <= finalStartDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // If activating this period, deactivate all other active periods
    if (dto.status === 'active' && period.status !== 'active') {
      const result = await this.prisma.evaluationPeriod.updateMany({
        where: { status: 'active', id: { not: id } },
        data: { status: 'closed' },
      });
      if (result.count > 0) {
        this.logger.warn(
          `Activating period "${period.name}" (ID ${id}) — auto-closed ${result.count} other active period(s)`,
        );
      }
    }

    const data: Prisma.EvaluationPeriodUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startDate !== undefined) data.startDate = finalStartDate;
    if (dto.endDate !== undefined) data.endDate = finalEndDate;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.isAnonymous !== undefined) data.isAnonymous = dto.isAnonymous;

    return this.prisma.evaluationPeriod.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const period = await this.prisma.evaluationPeriod.findUnique({ where: { id } });

    if (!period) {
      throw new NotFoundException(`Evaluation period with ID ${id} not found`);
    }

    const evalCount = await this.prisma.evaluation.count({ where: { periodid: id } });

    if (evalCount > 0) {
      this.logger.warn(
        `Deleting period "${period.name}" (ID ${id}) — cascading ${evalCount} evaluation(s)`,
      );
    }

    return this.prisma.evaluationPeriod.delete({ where: { id } });
  }
}
