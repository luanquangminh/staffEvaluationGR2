import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationsService } from './evaluations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    evaluation: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    staff2Group: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all evaluations', async () => {
      const mockEvaluations = [
        { id: 1, groupid: 1, reviewerid: 1, victimid: 2, questionid: 1, point: 4 },
        { id: 2, groupid: 1, reviewerid: 1, victimid: 2, questionid: 2, point: 5 },
      ];
      mockPrismaService.evaluation.findMany.mockResolvedValue(mockEvaluations);

      const result = await service.findAll();

      expect(result).toEqual(mockEvaluations);
    });

    it('should filter by groupId', async () => {
      const mockEvaluations = [{ id: 1, groupid: 1, point: 4 }];
      mockPrismaService.evaluation.findMany.mockResolvedValue(mockEvaluations);

      const result = await service.findAll({ groupId: 1 });

      expect(mockPrismaService.evaluation.findMany).toHaveBeenCalledWith({
        where: { groupid: 1 },
        include: {
          reviewer: true,
          victim: true,
          group: true,
          question: true,
        },
      });
    });

    it('should filter by reviewerId', async () => {
      await service.findAll({ reviewerId: 1 });

      expect(mockPrismaService.evaluation.findMany).toHaveBeenCalledWith({
        where: { reviewerid: 1 },
        include: expect.any(Object),
      });
    });

    it('should filter by victimId', async () => {
      await service.findAll({ victimId: 2 });

      expect(mockPrismaService.evaluation.findMany).toHaveBeenCalledWith({
        where: { victimid: 2 },
        include: expect.any(Object),
      });
    });
  });

  describe('findByReviewer', () => {
    it('should return evaluations by reviewer', async () => {
      const mockEvaluations = [
        { id: 1, reviewerid: 1, victimid: 2, point: 4 },
      ];
      mockPrismaService.evaluation.findMany.mockResolvedValue(mockEvaluations);

      const result = await service.findByReviewer(1);

      expect(result).toEqual(mockEvaluations);
      expect(mockPrismaService.evaluation.findMany).toHaveBeenCalledWith({
        where: { reviewerid: 1 },
        include: { victim: true, question: true },
      });
    });

    it('should filter by groupId when provided', async () => {
      await service.findByReviewer(1, 2);

      expect(mockPrismaService.evaluation.findMany).toHaveBeenCalledWith({
        where: { reviewerid: 1, groupid: 2 },
        include: { victim: true, question: true },
      });
    });
  });

  describe('findGroupsByStaff', () => {
    it('should return groups that staff belongs to', async () => {
      const mockStaffGroups = [
        { group: { id: 1, name: 'Group 1' } },
        { group: { id: 2, name: 'Group 2' } },
      ];
      mockPrismaService.staff2Group.findMany.mockResolvedValue(mockStaffGroups);

      const result = await service.findGroupsByStaff(1);

      expect(result).toEqual([
        { id: 1, name: 'Group 1' },
        { id: 2, name: 'Group 2' },
      ]);
    });
  });

  describe('findColleagues', () => {
    it('should return colleagues in the same group excluding self', async () => {
      const mockStaffGroups = [
        { staff: { id: 2, name: 'Colleague 1' } },
        { staff: { id: 3, name: 'Colleague 2' } },
      ];
      mockPrismaService.staff2Group.findMany.mockResolvedValue(mockStaffGroups);

      const result = await service.findColleagues(1, 1);

      expect(result).toEqual([
        { id: 2, name: 'Colleague 1' },
        { id: 3, name: 'Colleague 2' },
      ]);
      expect(mockPrismaService.staff2Group.findMany).toHaveBeenCalledWith({
        where: {
          groupid: 1,
          NOT: { staffid: 1 },
        },
        include: { staff: true },
      });
    });
  });

  describe('bulkUpsert', () => {
    const validDto = {
      groupId: 1,
      victimId: 2,
      evaluations: { 1: 4, 2: 5 },
    };
    const reviewerStaffId = 1;

    beforeEach(() => {
      mockPrismaService.staff2Group.findFirst
        .mockResolvedValueOnce({ staffid: 1, groupid: 1 }) // reviewer in group
        .mockResolvedValueOnce({ staffid: 2, groupid: 1 }); // victim in group
    });

    it('should upsert evaluations successfully', async () => {
      mockPrismaService.$transaction.mockResolvedValue([
        { id: 1, point: 4 },
        { id: 2, point: 5 },
      ]);

      const result = await service.bulkUpsert(validDto, reviewerStaffId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when staffId is missing', async () => {
      await expect(service.bulkUpsert(validDto, null as any)).rejects.toThrow(
        new ForbiddenException('Staff ID is required')
      );
    });

    it('should throw ForbiddenException when trying to self-evaluate', async () => {
      const selfEvalDto = { ...validDto, victimId: 1 };

      await expect(service.bulkUpsert(selfEvalDto, 1)).rejects.toThrow(
        new ForbiddenException('Cannot evaluate yourself')
      );
    });

    it('should throw ForbiddenException when reviewer not in group', async () => {
      mockPrismaService.staff2Group.findFirst.mockReset();
      mockPrismaService.staff2Group.findFirst.mockResolvedValueOnce(null);

      await expect(service.bulkUpsert(validDto, 1)).rejects.toThrow(
        new ForbiddenException('You are not a member of this group')
      );
    });

    it('should throw BadRequestException when victim not in group', async () => {
      mockPrismaService.staff2Group.findFirst.mockReset();
      mockPrismaService.staff2Group.findFirst
        .mockResolvedValueOnce({ staffid: 1, groupid: 1 }) // reviewer in group
        .mockResolvedValueOnce(null); // victim not in group

      await expect(service.bulkUpsert(validDto, 1)).rejects.toThrow(
        new BadRequestException('Target staff is not a member of this group')
      );
    });

    it('should throw BadRequestException for invalid point values (negative)', async () => {
      const invalidDto = {
        ...validDto,
        evaluations: { 1: -1 },
      };

      await expect(service.bulkUpsert(invalidDto, reviewerStaffId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid point values (too high)', async () => {
      const invalidDto = {
        ...validDto,
        evaluations: { 1: 11 },
      };

      await expect(service.bulkUpsert(invalidDto, reviewerStaffId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-number point values', async () => {
      const invalidDto = {
        ...validDto,
        evaluations: { 1: 'invalid' as any },
      };

      await expect(service.bulkUpsert(invalidDto, reviewerStaffId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for Infinity point values', async () => {
      const invalidDto = {
        ...validDto,
        evaluations: { 1: Infinity },
      };

      await expect(service.bulkUpsert(invalidDto, reviewerStaffId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStaff2Groups', () => {
    it('should return all staff-group relationships', async () => {
      const mockRelationships = [
        { staffid: 1, groupid: 1, staff: { name: 'Staff 1' }, group: { name: 'Group 1' } },
        { staffid: 2, groupid: 1, staff: { name: 'Staff 2' }, group: { name: 'Group 1' } },
      ];
      mockPrismaService.staff2Group.findMany.mockResolvedValue(mockRelationships);

      const result = await service.getStaff2Groups();

      expect(result).toEqual(mockRelationships);
      expect(mockPrismaService.staff2Group.findMany).toHaveBeenCalledWith({
        include: { staff: true, group: true },
      });
    });
  });
});
