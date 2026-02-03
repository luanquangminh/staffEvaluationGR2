import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

describe('EvaluationsController', () => {
  let controller: EvaluationsController;
  let service: EvaluationsService;

  const mockEvaluationsService = {
    findAll: jest.fn(),
    findByReviewer: jest.fn(),
    findGroupsByStaff: jest.fn(),
    findColleagues: jest.fn(),
    getStaff2Groups: jest.fn(),
    bulkUpsert: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    sub: 'user-123',
    email: 'test@example.com',
    staffId: 1,
    roles: ['user'],
  };

  const mockAdminUser = {
    id: 'admin-123',
    sub: 'admin-123',
    email: 'admin@example.com',
    staffId: 99,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationsController],
      providers: [
        {
          provide: EvaluationsService,
          useValue: mockEvaluationsService,
        },
      ],
    }).compile();

    controller = module.get<EvaluationsController>(EvaluationsController);
    service = module.get<EvaluationsService>(EvaluationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all evaluations without filters', async () => {
      const mockEvaluations = [
        { id: 1, groupid: 1, reviewerid: 1, victimid: 2, point: 4 },
        { id: 2, groupid: 1, reviewerid: 1, victimid: 2, point: 5 },
      ];
      mockEvaluationsService.findAll.mockResolvedValue(mockEvaluations);

      const result = await controller.findAll();

      expect(result).toEqual(mockEvaluations);
      expect(mockEvaluationsService.findAll).toHaveBeenCalledWith({
        groupId: undefined,
        reviewerId: undefined,
        victimId: undefined,
      });
    });

    it('should filter by groupId', async () => {
      mockEvaluationsService.findAll.mockResolvedValue([]);

      await controller.findAll('1');

      expect(mockEvaluationsService.findAll).toHaveBeenCalledWith({
        groupId: 1,
        reviewerId: undefined,
        victimId: undefined,
      });
    });

    it('should filter by reviewerId', async () => {
      mockEvaluationsService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, '1');

      expect(mockEvaluationsService.findAll).toHaveBeenCalledWith({
        groupId: undefined,
        reviewerId: 1,
        victimId: undefined,
      });
    });

    it('should filter by victimId', async () => {
      mockEvaluationsService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, undefined, '2');

      expect(mockEvaluationsService.findAll).toHaveBeenCalledWith({
        groupId: undefined,
        reviewerId: undefined,
        victimId: 2,
      });
    });

    it('should filter by multiple params', async () => {
      mockEvaluationsService.findAll.mockResolvedValue([]);

      await controller.findAll('1', '2', '3');

      expect(mockEvaluationsService.findAll).toHaveBeenCalledWith({
        groupId: 1,
        reviewerId: 2,
        victimId: 3,
      });
    });
  });

  describe('findMy', () => {
    it('should return evaluations for current user', async () => {
      const mockEvaluations = [{ id: 1, reviewerid: 1, victimid: 2, point: 4 }];
      mockEvaluationsService.findByReviewer.mockResolvedValue(mockEvaluations);

      const result = await controller.findMy(mockUser);

      expect(result).toEqual(mockEvaluations);
      expect(mockEvaluationsService.findByReviewer).toHaveBeenCalledWith(1, undefined);
    });

    it('should filter by groupId', async () => {
      mockEvaluationsService.findByReviewer.mockResolvedValue([]);

      await controller.findMy(mockUser, '1');

      expect(mockEvaluationsService.findByReviewer).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('findMyGroups', () => {
    it('should return groups for current user', async () => {
      const mockGroups = [
        { id: 1, name: 'Group 1' },
        { id: 2, name: 'Group 2' },
      ];
      mockEvaluationsService.findGroupsByStaff.mockResolvedValue(mockGroups);

      const result = await controller.findMyGroups(mockUser);

      expect(result).toEqual(mockGroups);
      expect(mockEvaluationsService.findGroupsByStaff).toHaveBeenCalledWith(1);
    });

    it('should return empty array when user has no groups', async () => {
      mockEvaluationsService.findGroupsByStaff.mockResolvedValue([]);

      const result = await controller.findMyGroups(mockUser);

      expect(result).toEqual([]);
    });
  });

  describe('findColleagues', () => {
    it('should return colleagues in a group', async () => {
      const mockColleagues = [
        { id: 2, name: 'Colleague 1', staffcode: 'GV002' },
        { id: 3, name: 'Colleague 2', staffcode: 'GV003' },
      ];
      mockEvaluationsService.findColleagues.mockResolvedValue(mockColleagues);

      const result = await controller.findColleagues(1, mockUser);

      expect(result).toEqual(mockColleagues);
      expect(mockEvaluationsService.findColleagues).toHaveBeenCalledWith(1, 1);
    });

    it('should exclude current user from colleagues', async () => {
      mockEvaluationsService.findColleagues.mockResolvedValue([]);

      await controller.findColleagues(1, mockUser);

      // Second argument is the current user's staffId
      expect(mockEvaluationsService.findColleagues).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getStaff2Groups', () => {
    it('should return all staff-group relationships', async () => {
      const mockRelationships = [
        { staffid: 1, groupid: 1, staff: { name: 'Staff 1' }, group: { name: 'Group 1' } },
        { staffid: 2, groupid: 1, staff: { name: 'Staff 2' }, group: { name: 'Group 1' } },
      ];
      mockEvaluationsService.getStaff2Groups.mockResolvedValue(mockRelationships);

      const result = await controller.getStaff2Groups();

      expect(result).toEqual(mockRelationships);
      expect(mockEvaluationsService.getStaff2Groups).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkUpsert', () => {
    it('should create/update evaluations', async () => {
      const dto = {
        groupId: 1,
        victimId: 2,
        evaluations: { 1: 4, 2: 5 },
      };
      const mockResults = [
        { id: 1, point: 4 },
        { id: 2, point: 5 },
      ];
      mockEvaluationsService.bulkUpsert.mockResolvedValue(mockResults);

      const result = await controller.bulkUpsert(dto, mockUser);

      expect(result).toEqual(mockResults);
      expect(mockEvaluationsService.bulkUpsert).toHaveBeenCalledWith(dto, 1);
    });

    it('should pass user staffId to service', async () => {
      const dto = {
        groupId: 1,
        victimId: 3,
        evaluations: { 1: 3 },
      };
      mockEvaluationsService.bulkUpsert.mockResolvedValue([]);

      await controller.bulkUpsert(dto, mockUser);

      expect(mockEvaluationsService.bulkUpsert).toHaveBeenCalledWith(dto, mockUser.staffId);
    });

    it('should handle multiple evaluations', async () => {
      const dto = {
        groupId: 1,
        victimId: 2,
        evaluations: { 1: 4, 2: 5, 3: 3, 4: 4, 5: 5 },
      };
      const mockResults = [
        { id: 1, point: 4 },
        { id: 2, point: 5 },
        { id: 3, point: 3 },
        { id: 4, point: 4 },
        { id: 5, point: 5 },
      ];
      mockEvaluationsService.bulkUpsert.mockResolvedValue(mockResults);

      const result = await controller.bulkUpsert(dto, mockUser);

      expect(result).toHaveLength(5);
    });
  });
});
