import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.staff.findMany({
      orderBy: { id: 'asc' },
      include: {
        organizationUnit: true,
      },
    });
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
    return this.prisma.staff.create({
      data: dto,
      include: {
        organizationUnit: true,
      },
    });
  }

  async update(id: number, dto: UpdateStaffDto, user: any) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    // Check if user is admin or updating their own profile
    const isAdmin = user.roles?.includes('admin');
    const isOwnProfile = user.staffId === id;

    if (!isAdmin && !isOwnProfile) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.staff.update({
      where: { id },
      data: dto,
      include: {
        organizationUnit: true,
      },
    });
  }

  async remove(id: number) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff with ID ${id} not found`);
    }

    return this.prisma.staff.delete({ where: { id } });
  }
}
