import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: PrismaService;

  const mockPrismaService = {
    staff: {
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
        StaffService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of staff', async () => {
      const mockStaff = [
        { id: 1, name: 'John Doe', staffcode: 'GV001', organizationUnit: null },
        { id: 2, name: 'Jane Doe', staffcode: 'GV002', organizationUnit: null },
      ];
      mockPrismaService.staff.findMany.mockResolvedValue(mockStaff);

      const result = await service.findAll();

      expect(result).toEqual(mockStaff);
      expect(mockPrismaService.staff.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
        include: { organizationUnit: true },
      });
    });

    it('should return empty array when no staff exists', async () => {
      mockPrismaService.staff.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single staff member', async () => {
      const mockStaff = {
        id: 1,
        name: 'John Doe',
        staffcode: 'GV001',
        organizationUnit: null,
        staffGroups: [],
      };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);

      const result = await service.findOne(1);

      expect(result).toEqual(mockStaff);
      expect(mockPrismaService.staff.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          organizationUnit: true,
          staffGroups: { include: { group: true } },
        },
      });
    });

    it('should throw NotFoundException when staff not found', async () => {
      mockPrismaService.staff.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Staff with ID 999 not found');
    });
  });

  describe('create', () => {
    it('should create a new staff member', async () => {
      const createDto = {
        name: 'New Staff',
        staffcode: 'GV003',
        emailh: 'staff@example.com',
      };
      const mockCreatedStaff = {
        id: 3,
        ...createDto,
        organizationUnit: null,
      };
      mockPrismaService.staff.create.mockResolvedValue(mockCreatedStaff);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedStaff);
      expect(mockPrismaService.staff.create).toHaveBeenCalledWith({
        data: createDto,
        include: { organizationUnit: true },
      });
    });
  });

  describe('update', () => {
    const mockUser = { roles: ['admin'], staffId: 99 };
    const mockStaff = { id: 1, name: 'John Doe' };

    it('should update a staff member when user is admin', async () => {
      const updateDto = { name: 'Updated Name' };
      const mockUpdatedStaff = { ...mockStaff, ...updateDto, organizationUnit: null };

      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staff.update.mockResolvedValue(mockUpdatedStaff);

      const result = await service.update(1, updateDto, mockUser);

      expect(result).toEqual(mockUpdatedStaff);
      expect(mockPrismaService.staff.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
        include: { organizationUnit: true },
      });
    });

    it('should update own profile when user is not admin', async () => {
      const updateDto = { name: 'Updated Name' };
      const userWithOwnProfile = { roles: ['user'], staffId: 1 };
      const mockUpdatedStaff = { ...mockStaff, ...updateDto, organizationUnit: null };

      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staff.update.mockResolvedValue(mockUpdatedStaff);

      const result = await service.update(1, updateDto, userWithOwnProfile);

      expect(result).toEqual(mockUpdatedStaff);
    });

    it('should throw NotFoundException when staff not found', async () => {
      mockPrismaService.staff.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' }, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin updates other profile', async () => {
      const regularUser = { roles: ['user'], staffId: 2 };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);

      await expect(service.update(1, { name: 'Test' }, regularUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a staff member', async () => {
      const mockStaff = { id: 1, name: 'John Doe' };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staff.delete.mockResolvedValue(mockStaff);

      const result = await service.remove(1);

      expect(result).toEqual(mockStaff);
      expect(mockPrismaService.staff.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when staff not found', async () => {
      mockPrismaService.staff.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
