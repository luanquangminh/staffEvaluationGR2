import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

describe('StaffController', () => {
  let controller: StaffController;
  let service: StaffService;

  const mockStaffService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        {
          provide: StaffService,
          useValue: mockStaffService,
        },
      ],
    }).compile();

    controller = module.get<StaffController>(StaffController);
    service = module.get<StaffService>(StaffService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of staff', async () => {
      const mockStaff = [
        { id: 1, name: 'John Doe', staffcode: 'GV001' },
        { id: 2, name: 'Jane Doe', staffcode: 'GV002' },
      ];
      mockStaffService.findAll.mockResolvedValue(mockStaff);

      const result = await controller.findAll();

      expect(result).toEqual(mockStaff);
      expect(mockStaffService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a single staff member', async () => {
      const mockStaff = { id: 1, name: 'John Doe', staffcode: 'GV001' };
      mockStaffService.findOne.mockResolvedValue(mockStaff);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockStaff);
      expect(mockStaffService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new staff member', async () => {
      const createDto = {
        name: 'New Staff',
        staffcode: 'GV003',
        emailh: 'staff@example.com',
      };
      const mockCreatedStaff = { id: 3, ...createDto };
      mockStaffService.create.mockResolvedValue(mockCreatedStaff);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCreatedStaff);
      expect(mockStaffService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a staff member', async () => {
      const updateDto = { name: 'Updated Name' };
      const mockUser = { id: 'user-1', roles: ['admin'], staffId: 99 };
      const mockUpdatedStaff = { id: 1, name: 'Updated Name', staffcode: 'GV001' };
      mockStaffService.update.mockResolvedValue(mockUpdatedStaff);

      const result = await controller.update(1, updateDto, mockUser);

      expect(result).toEqual(mockUpdatedStaff);
      expect(mockStaffService.update).toHaveBeenCalledWith(1, updateDto, mockUser);
    });

    it('should pass user context for authorization', async () => {
      const updateDto = { name: 'My Name' };
      const mockUser = { id: 'user-1', roles: ['user'], staffId: 1 };
      mockStaffService.update.mockResolvedValue({ id: 1, ...updateDto });

      await controller.update(1, updateDto, mockUser);

      expect(mockStaffService.update).toHaveBeenCalledWith(1, updateDto, mockUser);
    });
  });

  describe('remove', () => {
    it('should delete a staff member', async () => {
      const mockStaff = { id: 1, name: 'John Doe' };
      mockStaffService.remove.mockResolvedValue(mockStaff);

      const result = await controller.remove(1);

      expect(result).toEqual(mockStaff);
      expect(mockStaffService.remove).toHaveBeenCalledWith(1);
    });
  });
});
