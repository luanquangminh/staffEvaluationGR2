import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationUnitDto, UpdateOrganizationUnitDto } from './dto/organization-units.dto';

@Injectable()
export class OrganizationUnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organizationUnit.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.organizationUnit.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException(`Organization unit with ID ${id} not found`);
    }

    return unit;
  }

  async create(dto: CreateOrganizationUnitDto) {
    return this.prisma.organizationUnit.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateOrganizationUnitDto) {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException(`Organization unit with ID ${id} not found`);
    }

    return this.prisma.organizationUnit.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const unit = await this.prisma.organizationUnit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException(`Organization unit with ID ${id} not found`);
    }

    return this.prisma.organizationUnit.delete({ where: { id } });
  }
}
