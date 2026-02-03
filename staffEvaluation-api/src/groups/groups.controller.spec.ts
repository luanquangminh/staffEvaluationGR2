import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;

  const mockGroupsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getMembers: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMembers: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: mockGroupsService,
        },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get<GroupsService>(GroupsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of groups', async () => {
      const mockGroups = [
        { id: 1, name: 'Group 1', organizationUnit: null },
        { id: 2, name: 'Group 2', organizationUnit: { id: 1, name: 'Unit 1' } },
      ];
      mockGroupsService.findAll.mockResolvedValue(mockGroups);

      const result = await controller.findAll();

      expect(result).toEqual(mockGroups);
      expect(mockGroupsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no groups exist', async () => {
      mockGroupsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single group with details', async () => {
      const mockGroup = {
        id: 1,
        name: 'Group 1',
        organizationUnit: null,
        staffGroups: [{ staff: { id: 1, name: 'Staff 1' } }],
      };
      mockGroupsService.findOne.mockResolvedValue(mockGroup);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockGroup);
      expect(mockGroupsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('getMembers', () => {
    it('should return array of staff members in a group', async () => {
      const mockMembers = [
        { id: 1, name: 'Staff 1', staffcode: 'GV001' },
        { id: 2, name: 'Staff 2', staffcode: 'GV002' },
      ];
      mockGroupsService.getMembers.mockResolvedValue(mockMembers);

      const result = await controller.getMembers(1);

      expect(result).toEqual(mockMembers);
      expect(mockGroupsService.getMembers).toHaveBeenCalledWith(1);
    });

    it('should return empty array when group has no members', async () => {
      mockGroupsService.getMembers.mockResolvedValue([]);

      const result = await controller.getMembers(1);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new group', async () => {
      const createDto = { name: 'New Group', organizationunitid: 1 };
      const mockCreatedGroup = {
        id: 3,
        name: 'New Group',
        organizationUnit: { id: 1, name: 'Unit 1' },
      };
      mockGroupsService.create.mockResolvedValue(mockCreatedGroup);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedGroup);
      expect(mockGroupsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should create group without organization unit', async () => {
      const createDto = { name: 'Standalone Group', organizationunitid: null };
      const mockCreatedGroup = { id: 4, name: 'Standalone Group', organizationUnit: null };
      mockGroupsService.create.mockResolvedValue(mockCreatedGroup);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedGroup);
    });
  });

  describe('update', () => {
    it('should update a group', async () => {
      const updateDto = { name: 'Updated Group' };
      const mockUpdatedGroup = { id: 1, name: 'Updated Group', organizationUnit: null };
      mockGroupsService.update.mockResolvedValue(mockUpdatedGroup);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(mockUpdatedGroup);
      expect(mockGroupsService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should update organization unit', async () => {
      const updateDto = { organizationunitid: 2 };
      const mockUpdatedGroup = {
        id: 1,
        name: 'Group 1',
        organizationUnit: { id: 2, name: 'Unit 2' },
      };
      mockGroupsService.update.mockResolvedValue(mockUpdatedGroup);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(mockUpdatedGroup);
    });
  });

  describe('updateMembers', () => {
    it('should update group members', async () => {
      const dto = { staffIds: [1, 2, 3] };
      const mockMembers = [
        { id: 1, name: 'Staff 1' },
        { id: 2, name: 'Staff 2' },
        { id: 3, name: 'Staff 3' },
      ];
      mockGroupsService.updateMembers.mockResolvedValue(mockMembers);

      const result = await controller.updateMembers(1, dto);

      expect(result).toEqual(mockMembers);
      expect(mockGroupsService.updateMembers).toHaveBeenCalledWith(1, dto);
    });

    it('should clear all members when empty array', async () => {
      const dto = { staffIds: [] };
      mockGroupsService.updateMembers.mockResolvedValue([]);

      const result = await controller.updateMembers(1, dto);

      expect(result).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should delete a group', async () => {
      const mockGroup = { id: 1, name: 'Group 1' };
      mockGroupsService.remove.mockResolvedValue(mockGroup);

      const result = await controller.remove(1);

      expect(result).toEqual(mockGroup);
      expect(mockGroupsService.remove).toHaveBeenCalledWith(1);
    });
  });
});
