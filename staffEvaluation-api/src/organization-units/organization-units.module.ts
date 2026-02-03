import { Module } from '@nestjs/common';
import { OrganizationUnitsService } from './organization-units.service';
import { OrganizationUnitsController } from './organization-units.controller';

@Module({
  controllers: [OrganizationUnitsController],
  providers: [OrganizationUnitsService],
  exports: [OrganizationUnitsService],
})
export class OrganizationUnitsModule {}
