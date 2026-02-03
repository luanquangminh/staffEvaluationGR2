import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUnitsController } from './organization-units.controller';
import { OrganizationUnitsService } from './organization-units.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('OrganizationUnitsController', () => {
  let controller: OrganizationUnitsController;
  let service: OrganizationUnitsService;

  const mockOrganizationUnitsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationUnitsController],
      providers: [
        { provide: OrganizationUnitsService, useValue: mockOrganizationUnitsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationUnitsController>(OrganizationUnitsController);
    service = module.get<OrganizationUnitsService>(OrganizationUnitsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all organization units', async () => {
      const mockUnits = [
        { id: 1, name: 'Unit 1' },
        { id: 2, name: 'Unit 2' },
      ];
      mockOrganizationUnitsService.findAll.mockResolvedValue(mockUnits);

      const result = await controller.findAll();

      expect(result).toEqual(mockUnits);
      expect(mockOrganizationUnitsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single organization unit', async () => {
      const mockUnit = { id: 1, name: 'Unit 1' };
      mockOrganizationUnitsService.findOne.mockResolvedValue(mockUnit);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockUnit);
      expect(mockOrganizationUnitsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new organization unit', async () => {
      const createDto = { id: 1, name: 'New Unit' };
      const createdUnit = { id: 1, name: 'New Unit' };
      mockOrganizationUnitsService.create.mockResolvedValue(createdUnit);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdUnit);
      expect(mockOrganizationUnitsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update an organization unit', async () => {
      const updateDto = { name: 'Updated Unit' };
      const updatedUnit = { id: 1, name: 'Updated Unit' };
      mockOrganizationUnitsService.update.mockResolvedValue(updatedUnit);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedUnit);
      expect(mockOrganizationUnitsService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete an organization unit', async () => {
      const deletedUnit = { id: 1, name: 'Deleted Unit' };
      mockOrganizationUnitsService.remove.mockResolvedValue(deletedUnit);

      const result = await controller.remove(1);

      expect(result).toEqual(deletedUnit);
      expect(mockOrganizationUnitsService.remove).toHaveBeenCalledWith(1);
    });
  });
});
