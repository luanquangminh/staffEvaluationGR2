import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    group: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    staff2Group: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of groups', async () => {
      const mockGroups = [
        { id: 1, name: 'Group 1', organizationUnit: null },
        { id: 2, name: 'Group 2', organizationUnit: null },
      ];
      mockPrismaService.group.findMany.mockResolvedValue(mockGroups);

      const result = await service.findAll();

      expect(result).toEqual(mockGroups);
      expect(mockPrismaService.group.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
        include: { organizationUnit: true },
      });
    });

    it('should return empty array when no groups exist', async () => {
      mockPrismaService.group.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single group with members', async () => {
      const mockGroup = {
        id: 1,
        name: 'Group 1',
        organizationUnit: null,
        staffGroups: [{ staff: { id: 1, name: 'Staff 1' } }],
      };
      mockPrismaService.group.findUnique.mockResolvedValue(mockGroup);

      const result = await service.findOne(1);

      expect(result).toEqual(mockGroup);
      expect(mockPrismaService.group.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          organizationUnit: true,
          staffGroups: { include: { staff: true } },
        },
      });
    });

    it('should throw NotFoundException when group not found', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Group with ID 999 not found');
    });
  });

  describe('getMembers', () => {
    it('should return array of staff members in a group', async () => {
      const mockGroup = {
        id: 1,
        name: 'Group 1',
        staffGroups: [
          { staff: { id: 1, name: 'Staff 1' } },
          { staff: { id: 2, name: 'Staff 2' } },
        ],
      };
      mockPrismaService.group.findUnique.mockResolvedValue(mockGroup);

      const result = await service.getMembers(1);

      expect(result).toEqual([
        { id: 1, name: 'Staff 1' },
        { id: 2, name: 'Staff 2' },
      ]);
    });

    it('should throw NotFoundException when group not found', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.getMembers(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new group', async () => {
      const createDto = {
        name: 'New Group',
        organizationunitid: 1,
      };
      const mockCreatedGroup = {
        id: 3,
        ...createDto,
        organizationUnit: { id: 1, name: 'Unit 1' },
      };
      mockPrismaService.group.create.mockResolvedValue(mockCreatedGroup);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedGroup);
      expect(mockPrismaService.group.create).toHaveBeenCalledWith({
        data: createDto,
        include: { organizationUnit: true },
      });
    });

    it('should create group without organization unit', async () => {
      const createDto = {
        name: 'Standalone Group',
        organizationunitid: null,
      };
      const mockCreatedGroup = {
        id: 4,
        ...createDto,
        organizationUnit: null,
      };
      mockPrismaService.group.create.mockResolvedValue(mockCreatedGroup);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedGroup);
    });
  });

  describe('update', () => {
    const mockGroup = { id: 1, name: 'Group 1' };

    it('should update a group', async () => {
      const updateDto = { name: 'Updated Group' };
      const mockUpdatedGroup = { ...mockGroup, ...updateDto, organizationUnit: null };

      mockPrismaService.group.findUnique.mockResolvedValue(mockGroup);
      mockPrismaService.group.update.mockResolvedValue(mockUpdatedGroup);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(mockUpdatedGroup);
      expect(mockPrismaService.group.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
        include: { organizationUnit: true },
      });
    });

    it('should throw NotFoundException when group not found', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMembers', () => {
    const mockGroup = { id: 1, name: 'Group 1' };

    it('should update group members', async () => {
      const dto = { staffIds: [1, 2, 3] };
      const mockMembers = [
        { id: 1, name: 'Staff 1' },
        { id: 2, name: 'Staff 2' },
        { id: 3, name: 'Staff 3' },
      ];

      mockPrismaService.group.findUnique
        .mockResolvedValueOnce(mockGroup)
        .mockResolvedValueOnce({
          ...mockGroup,
          staffGroups: mockMembers.map(s => ({ staff: s })),
        });
      mockPrismaService.staff2Group.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.staff2Group.createMany.mockResolvedValue({ count: 3 });

      const result = await service.updateMembers(1, dto);

      expect(mockPrismaService.staff2Group.deleteMany).toHaveBeenCalledWith({
        where: { groupid: 1 },
      });
      expect(mockPrismaService.staff2Group.createMany).toHaveBeenCalledWith({
        data: [
          { staffid: 1, groupid: 1 },
          { staffid: 2, groupid: 1 },
          { staffid: 3, groupid: 1 },
        ],
      });
    });

    it('should handle empty member list', async () => {
      const dto = { staffIds: [] };

      mockPrismaService.group.findUnique
        .mockResolvedValueOnce(mockGroup)
        .mockResolvedValueOnce({ ...mockGroup, staffGroups: [] });
      mockPrismaService.staff2Group.deleteMany.mockResolvedValue({ count: 5 });

      await service.updateMembers(1, dto);

      expect(mockPrismaService.staff2Group.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.staff2Group.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when group not found', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.updateMembers(999, { staffIds: [1] })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a group', async () => {
      const mockGroup = { id: 1, name: 'Group 1' };
      mockPrismaService.group.findUnique.mockResolvedValue(mockGroup);
      mockPrismaService.group.delete.mockResolvedValue(mockGroup);

      const result = await service.remove(1);

      expect(result).toEqual(mockGroup);
      expect(mockPrismaService.group.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when group not found', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
