import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';
import * as fs from 'fs';
import * as path from 'path';

const STAFF_FIND_ALL_HARD_CAP = 10000;

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(pagination?: PaginationDto) {
    if (pagination?.page && pagination?.limit) {
      const { page, limit } = pagination;
      const [data, total] = await Promise.all([
        this.prisma.staff.findMany({
          orderBy: { id: 'asc' },
          include: { organizationUnit: true },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.staff.count(),
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

    // Unpaginated: hard cap to prevent memory exhaustion on unbounded lists
    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        orderBy: { id: 'asc' },
        include: { organizationUnit: true },
        take: STAFF_FIND_ALL_HARD_CAP,
      }),
      this.prisma.staff.count(),
    ]);

    if (total > STAFF_FIND_ALL_HARD_CAP) {
      this.logger.warn(
        `staff.findAll truncated at ${STAFF_FIND_ALL_HARD_CAP} of ${total} rows — request pagination for full results`,
      );
    }

    return data;
  }

  async findOne(id: number) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        organizationUnit: true,
        staffGroups: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return staff;
  }

  async create(dto: CreateStaffDto) {
    try {
      return await this.prisma.staff.create({
        data: dto,
        include: {
          organizationUnit: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const fields = (error.meta?.target as string[])?.join(', ') || 'unknown field';
        throw new ConflictException(`Staff with duplicate ${fields} already exists`);
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateStaffDto, user: JwtPayload & { id: string }) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    // Check if user is admin or updating their own profile
    const isAdmin = user.roles?.includes('admin');
    const isOwnProfile = user.staffId != null && user.staffId === id;

    if (!isAdmin && !isOwnProfile) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Non-admin users can only update safe profile fields
    let updateData: Partial<UpdateStaffDto> = dto;
    if (!isAdmin) {
      const { staffcode, organizationunitid, bidv, position, isPartyMember, ...safeFields } = dto;
      updateData = safeFields;
    }

    try {
      return await this.prisma.staff.update({
        where: { id },
        data: updateData,
        include: {
          organizationUnit: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const fields = (error.meta?.target as string[])?.join(', ') || 'unknown field';
        throw new ConflictException(`Staff with duplicate ${fields} already exists`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    const [evalCount, groupCount] = await Promise.all([
      this.prisma.evaluation.count({ where: { OR: [{ reviewerid: id }, { evaluateeid: id }] } }),
      this.prisma.staff2Group.count({ where: { staffid: id } }),
    ]);

    if (evalCount > 0 || groupCount > 0) {
      this.logger.warn(
        `Deleting staff "${staff.name}" (ID ${id}) — cascading ${evalCount} evaluation(s), ${groupCount} group membership(s)`,
      );
    }

    return this.prisma.staff.delete({ where: { id } });
  }

  async updateAvatar(id: number, filePath: string, user: JwtPayload & { id: string }) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    const isAdmin = user.roles?.includes('admin');
    const isOwnProfile = user.staffId != null && user.staffId === id;

    if (!isAdmin && !isOwnProfile) {
      throw new ForbiddenException('You can only update your own avatar');
    }

    // Delete old avatar file if exists. Fire-and-forget on purpose — we don't
    // block the DB update on filesystem cleanup. `void` marks the intent
    // explicitly and satisfies no-floating-promises.
    if (staff.avatar) {
      const oldPath = path.join(process.cwd(), staff.avatar);
      void fs.promises.unlink(oldPath).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') {
          this.logger.warn(`Failed to delete old avatar ${oldPath}: ${err.message}`);
        }
      });
    }

    return this.prisma.staff.update({
      where: { id },
      data: { avatar: filePath },
      include: { organizationUnit: true },
    });
  }
}
