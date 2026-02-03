import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  let service: QuestionsService;

  const mockQuestionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        {
          provide: QuestionsService,
          useValue: mockQuestionsService,
        },
      ],
    }).compile();

    controller = module.get<QuestionsController>(QuestionsController);
    service = module.get<QuestionsService>(QuestionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of questions', async () => {
      const mockQuestions = [
        { id: 1, title: 'Question 1', description: 'Desc 1' },
        { id: 2, title: 'Question 2', description: 'Desc 2' },
      ];
      mockQuestionsService.findAll.mockResolvedValue(mockQuestions);

      const result = await controller.findAll();

      expect(result).toEqual(mockQuestions);
      expect(mockQuestionsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no questions exist', async () => {
      mockQuestionsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single question', async () => {
      const mockQuestion = { id: 1, title: 'Question 1', description: 'Desc 1' };
      mockQuestionsService.findOne.mockResolvedValue(mockQuestion);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockQuestion);
      expect(mockQuestionsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new question', async () => {
      const createDto = { title: 'New Question', description: 'New Desc' };
      const mockCreatedQuestion = { id: 3, ...createDto };
      mockQuestionsService.create.mockResolvedValue(mockCreatedQuestion);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedQuestion);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should create question with null description', async () => {
      const createDto = { title: 'Question without desc', description: null };
      const mockCreatedQuestion = { id: 4, ...createDto };
      mockQuestionsService.create.mockResolvedValue(mockCreatedQuestion);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedQuestion);
    });
  });

  describe('update', () => {
    it('should update a question', async () => {
      const updateDto = { title: 'Updated Question' };
      const mockUpdatedQuestion = { id: 1, title: 'Updated Question', description: 'Desc 1' };
      mockQuestionsService.update.mockResolvedValue(mockUpdatedQuestion);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(mockUpdatedQuestion);
      expect(mockQuestionsService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should update only description', async () => {
      const updateDto = { description: 'Updated Desc' };
      const mockUpdatedQuestion = { id: 1, title: 'Question 1', description: 'Updated Desc' };
      mockQuestionsService.update.mockResolvedValue(mockUpdatedQuestion);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(mockUpdatedQuestion);
    });
  });

  describe('remove', () => {
    it('should delete a question', async () => {
      const mockQuestion = { id: 1, title: 'Question 1' };
      mockQuestionsService.remove.mockResolvedValue(mockQuestion);

      const result = await controller.remove(1);

      expect(result).toEqual(mockQuestion);
      expect(mockQuestionsService.remove).toHaveBeenCalledWith(1);
    });
  });
});
