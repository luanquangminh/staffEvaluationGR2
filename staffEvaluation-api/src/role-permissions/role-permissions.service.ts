import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ResultsAccess } from './dto/role-permission.dto';

@Injectable()
export class RolePermissionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.rolePermission.findMany();
  }

  async findOne(role: string): Promise<ResultsAccess> {
    const record = await this.prisma.rolePermission.findUnique({ where: { role } });
    return (record?.resultsAccess ?? 'none') as ResultsAccess;
  }

  async update(role: string, resultsAccess: ResultsAccess) {
    return this.prisma.rolePermission.upsert({
      where: { role },
      update: { resultsAccess },
      create: { role, resultsAccess },
    });
  }
}
