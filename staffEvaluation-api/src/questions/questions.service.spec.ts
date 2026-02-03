import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    question: {
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
        QuestionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of questions', async () => {
      const mockQuestions = [
        { id: 1, title: 'Question 1', description: 'Description 1' },
        { id: 2, title: 'Question 2', description: 'Description 2' },
      ];
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      const result = await service.findAll();

      expect(result).toEqual(mockQuestions);
      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
    });

    it('should return empty array when no questions exist', async () => {
      mockPrismaService.question.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single question', async () => {
      const mockQuestion = { id: 1, title: 'Question 1', description: 'Description 1' };
      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await service.findOne(1);

      expect(result).toEqual(mockQuestion);
      expect(mockPrismaService.question.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when question not found', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Question with ID 999 not found');
    });
  });

  describe('create', () => {
    it('should create a new question', async () => {
      const createDto = {
        title: 'New Question',
        description: 'New Description',
      };
      const mockCreatedQuestion = {
        id: 3,
        ...createDto,
      };
      mockPrismaService.question.create.mockResolvedValue(mockCreatedQuestion);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedQuestion);
      expect(mockPrismaService.question.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should create question with null description', async () => {
      const createDto = {
        title: 'Question without description',
        description: null,
      };
      const mockCreatedQuestion = {
        id: 4,
        ...createDto,
      };
      mockPrismaService.question.create.mockResolvedValue(mockCreatedQuestion);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedQuestion);
    });
  });

  describe('update', () => {
    const mockQuestion = { id: 1, title: 'Question 1', description: 'Description 1' };

    it('should update a question', async () => {
      const updateDto = { title: 'Updated Question' };
      const mockUpdatedQuestion = { ...mockQuestion, ...updateDto };

      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.question.update.mockResolvedValue(mockUpdatedQuestion);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(mockUpdatedQuestion);
      expect(mockPrismaService.question.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when question not found', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a question', async () => {
      const mockQuestion = { id: 1, title: 'Question 1' };
      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.question.delete.mockResolvedValue(mockQuestion);

      const result = await service.remove(1);

      expect(result).toEqual(mockQuestion);
      expect(mockPrismaService.question.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when question not found', async () => {
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
