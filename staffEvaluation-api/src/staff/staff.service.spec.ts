import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
      count: jest.fn(),
    },
    evaluation: {
      count: jest.fn(),
    },
    staff2Group: {
      count: jest.fn(),
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
    it('should return an array of staff with hard cap', async () => {
      const mockStaff = [
        { id: 1, name: 'John Doe', staffcode: 'GV001', organizationUnit: null },
        { id: 2, name: 'Jane Doe', staffcode: 'GV002', organizationUnit: null },
      ];
      mockPrismaService.staff.findMany.mockResolvedValue(mockStaff);
      mockPrismaService.staff.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(result).toEqual(mockStaff);
      expect(mockPrismaService.staff.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
        include: { organizationUnit: true },
        take: 10000,
      });
    });

    it('should log a warning when unpaginated result is truncated at hard cap', async () => {
      const mockStaff = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Staff ${i}`,
      }));
      mockPrismaService.staff.findMany.mockResolvedValue(mockStaff);
      mockPrismaService.staff.count.mockResolvedValue(12500);
      const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});

      const result = await service.findAll();

      expect(result).toHaveLength(10000);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('truncated at 10000 of 12500'),
      );
      warnSpy.mockRestore();
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
        homeEmail: 'staff@example.com',
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
    const mockUser = { id: 'user-1', sub: 'user-1', email: 'admin@test.com', roles: ['admin'], staffId: 99 };
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
      const userWithOwnProfile = { id: 'user-2', sub: 'user-2', email: 'user@test.com', roles: ['user'], staffId: 1 };
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
      const regularUser = { id: 'user-3', sub: 'user-3', email: 'other@test.com', roles: ['user'], staffId: 2 };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);

      await expect(service.update(1, { name: 'Test' }, regularUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a staff member', async () => {
      const mockStaff = { id: 1, name: 'John Doe' };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.evaluation.count.mockResolvedValue(0);
      mockPrismaService.staff2Group.count.mockResolvedValue(0);
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

  describe('findAll (pagination)', () => {
    it('should return paginated results when page and limit are provided', async () => {
      const mockData = [{ id: 1, name: 'Staff 1', organizationUnit: null }];
      mockPrismaService.staff.findMany.mockResolvedValue(mockData);
      mockPrismaService.staff.count.mockResolvedValue(15);

      const result = await service.findAll({ page: 2, limit: 10 }) as any;

      expect(result.data).toEqual(mockData);
      expect(result.meta).toEqual({ total: 15, page: 2, limit: 10, totalPages: 2 });
      expect(mockPrismaService.staff.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('update (field stripping)', () => {
    it('should strip sensitive fields for non-admin self-update', async () => {
      const mockStaff = { id: 1, name: 'John Doe' };
      const regularUser = { id: 'user-1', sub: 'user-1', email: 'user@test.com', roles: ['user'], staffId: 1 };
      const updateDto = {
        name: 'New Name',
        staffcode: 'SHOULD_BE_STRIPPED',
        organizationunitid: 99,
        bidv: 'STRIPPED',
        position: 'STRIPPED',
        isPartyMember: true,
      };

      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staff.update.mockResolvedValue({ ...mockStaff, name: 'New Name', organizationUnit: null });

      await service.update(1, updateDto, regularUser);

      // Only safe fields should be in the update call
      const updateCall = mockPrismaService.staff.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ name: 'New Name' });
      expect(updateCall.data).not.toHaveProperty('staffcode');
      expect(updateCall.data).not.toHaveProperty('organizationunitid');
      expect(updateCall.data).not.toHaveProperty('bidv');
      expect(updateCall.data).not.toHaveProperty('position');
      expect(updateCall.data).not.toHaveProperty('isPartyMember');
    });
  });

  describe('create (conflict handling)', () => {
    it('should throw ConflictException on duplicate staff', async () => {
      const createDto = { name: 'New Staff', staffcode: 'GV001', homeEmail: 'test@test.com' };
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['staffcode'] },
      });
      mockPrismaService.staff.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateAvatar', () => {
    const adminUser = { id: 'user-1', sub: 'user-1', email: 'admin@test.com', roles: ['admin'], staffId: 99 };
    const mockStaff = { id: 1, name: 'John Doe', avatar: null };

    it('should update avatar for admin user', async () => {
      const updated = { ...mockStaff, avatar: '/uploads/avatars/1-123.jpg', organizationUnit: null };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staff.update.mockResolvedValue(updated);

      const result = await service.updateAvatar(1, '/uploads/avatars/1-123.jpg', adminUser);

      expect(result).toEqual(updated);
      expect(mockPrismaService.staff.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { avatar: '/uploads/avatars/1-123.jpg' },
        include: { organizationUnit: true },
      });
    });

    it('should update avatar for own profile', async () => {
      const ownUser = { id: 'user-2', sub: 'user-2', email: 'user@test.com', roles: ['user'], staffId: 1 };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staff.update.mockResolvedValue({ ...mockStaff, avatar: '/uploads/avatars/1-123.jpg', organizationUnit: null });

      await service.updateAvatar(1, '/uploads/avatars/1-123.jpg', ownUser);

      expect(mockPrismaService.staff.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when staff not found', async () => {
      mockPrismaService.staff.findUnique.mockResolvedValue(null);

      await expect(service.updateAvatar(999, '/path', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin updates other profile', async () => {
      const regularUser = { id: 'user-3', sub: 'user-3', email: 'other@test.com', roles: ['user'], staffId: 2 };
      mockPrismaService.staff.findUnique.mockResolvedValue(mockStaff);

      await expect(service.updateAvatar(1, '/path', regularUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
