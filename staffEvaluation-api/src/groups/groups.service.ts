import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, UpdateGroupMembersDto } from './dto/groups.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.group.findMany({
      orderBy: { id: 'asc' },
      include: {
        organizationUnit: true,
      },
    });
  }

  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        organizationUnit: true,
        staffGroups: {
          include: {
            staff: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  async getMembers(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        staffGroups: {
          include: {
            staff: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group.staffGroups.map((sg) => sg.staff);
  }

  async create(dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: dto,
      include: {
        organizationUnit: true,
      },
    });
  }

  async update(id: number, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({ where: { id } });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return this.prisma.group.update({
      where: { id },
      data: dto,
      include: {
        organizationUnit: true,
      },
    });
  }

  async updateMembers(id: number, dto: UpdateGroupMembersDto) {
    const group = await this.prisma.group.findUnique({ where: { id } });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    // Delete existing members
    await this.prisma.staff2Group.deleteMany({
      where: { groupid: id },
    });

    // Add new members
    if (dto.staffIds.length > 0) {
      await this.prisma.staff2Group.createMany({
        data: dto.staffIds.map((staffid) => ({
          staffid,
          groupid: id,
        })),
      });
    }

    return this.getMembers(id);
  }

  async remove(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id } });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return this.prisma.group.delete({ where: { id } });
  }
}
