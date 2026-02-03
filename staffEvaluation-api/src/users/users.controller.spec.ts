import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    getProfiles: jest.fn(),
    getProfile: jest.fn(),
    linkStaff: jest.fn(),
    getUsersWithRoles: jest.fn(),
    addRole: jest.fn(),
    removeRole: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfiles', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [{ id: '1', userId: 'user-1' }];
      mockUsersService.getProfiles.mockResolvedValue(mockProfiles);

      const result = await controller.getProfiles();

      expect(result).toEqual(mockProfiles);
      expect(mockUsersService.getProfiles).toHaveBeenCalled();
    });
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      const mockProfile = { id: '1', userId: 'user-1', staffId: 1 };
      mockUsersService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile({ id: 'user-1' });

      expect(result).toEqual(mockProfile);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('linkStaff', () => {
    it('should link staff to profile', async () => {
      const dto = { profileId: 'profile-1', staffId: 1 };
      const linkedProfile = { id: 'profile-1', staffId: 1 };
      mockUsersService.linkStaff.mockResolvedValue(linkedProfile);

      const result = await controller.linkStaff(dto);

      expect(result).toEqual(linkedProfile);
      expect(mockUsersService.linkStaff).toHaveBeenCalledWith(dto);
    });
  });

  describe('getUsersWithRoles', () => {
    it('should return users with roles', async () => {
      const mockUsers = [{ id: 'user-1', roles: [{ role: 'admin' }] }];
      mockUsersService.getUsersWithRoles.mockResolvedValue(mockUsers);

      const result = await controller.getUsersWithRoles();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.getUsersWithRoles).toHaveBeenCalled();
    });
  });

  describe('addRole', () => {
    it('should add role to user', async () => {
      const dto = { role: 'admin' as const };
      const newRole = { id: 'role-1', userId: 'user-1', role: 'admin' };
      mockUsersService.addRole.mockResolvedValue(newRole);

      const result = await controller.addRole('user-1', dto);

      expect(result).toEqual(newRole);
      expect(mockUsersService.addRole).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      const deletedRole = { id: 'role-1', userId: 'user-1', role: 'admin' };
      mockUsersService.removeRole.mockResolvedValue(deletedRole);

      const result = await controller.removeRole('user-1', 'admin');

      expect(result).toEqual(deletedRole);
      expect(mockUsersService.removeRole).toHaveBeenCalledWith('user-1', 'admin');
    });
  });
});
