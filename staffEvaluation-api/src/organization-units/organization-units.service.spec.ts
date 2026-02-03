import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUnitsService } from './organization-units.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('OrganizationUnitsService', () => {
  let service: OrganizationUnitsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organizationUnit: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationUnitsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrganizationUnitsService>(OrganizationUnitsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all organization units ordered by id', async () => {
      const mockUnits = [
        { id: 1, name: 'Unit 1' },
        { id: 2, name: 'Unit 2' },
      ];
      mockPrismaService.organizationUnit.findMany.mockResolvedValue(mockUnits);

      const result = await service.findAll();

      expect(result).toEqual(mockUnits);
      expect(mockPrismaService.organizationUnit.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
    });

    it('should return empty array when no units exist', async () => {
      mockPrismaService.organizationUnit.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an organization unit by id', async () => {
      const mockUnit = { id: 1, name: 'Unit 1' };
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(mockUnit);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUnit);
      expect(mockPrismaService.organizationUnit.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if unit not found', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Organization unit with ID 999 not found');
    });
  });

  describe('create', () => {
    it('should create a new organization unit', async () => {
      const createDto = { id: 1, name: 'New Unit' };
      const createdUnit = { id: 1, name: 'New Unit' };
      mockPrismaService.organizationUnit.create.mockResolvedValue(createdUnit);

      const result = await service.create(createDto);

      expect(result).toEqual(createdUnit);
      expect(mockPrismaService.organizationUnit.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });
  });

  describe('update', () => {
    it('should update an organization unit', async () => {
      const updateDto = { name: 'Updated Unit' };
      const existingUnit = { id: 1, name: 'Old Unit' };
      const updatedUnit = { id: 1, name: 'Updated Unit' };

      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(existingUnit);
      mockPrismaService.organizationUnit.update.mockResolvedValue(updatedUnit);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedUnit);
      expect(mockPrismaService.organizationUnit.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if unit not found', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
      await expect(service.update(999, { name: 'Test' })).rejects.toThrow('Organization unit with ID 999 not found');
    });
  });

  describe('remove', () => {
    it('should delete an organization unit', async () => {
      const existingUnit = { id: 1, name: 'Unit to Delete' };
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(existingUnit);
      mockPrismaService.organizationUnit.delete.mockResolvedValue(existingUnit);

      const result = await service.remove(1);

      expect(result).toEqual(existingUnit);
      expect(mockPrismaService.organizationUnit.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if unit not found', async () => {
      mockPrismaService.organizationUnit.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow('Organization unit with ID 999 not found');
    });
  });
});
