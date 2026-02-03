import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    profile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userRole: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfiles', () => {
    it('should return all profiles with user and staff', async () => {
      const mockProfiles = [
        { id: '1', userId: 'user-1', staffId: 1, user: { id: 'user-1', email: 'test@example.com' }, staff: { id: 1, name: 'Test Staff' } },
      ];
      mockPrismaService.profile.findMany.mockResolvedValue(mockProfiles);

      const result = await service.getProfiles();

      expect(result).toEqual(mockProfiles);
      expect(mockPrismaService.profile.findMany).toHaveBeenCalledWith({
        include: {
          user: { select: { id: true, email: true, createdAt: true } },
          staff: true,
        },
      });
    });
  });

  describe('getProfile', () => {
    it('should return a profile by userId', async () => {
      const mockProfile = { id: '1', userId: 'user-1', staffId: 1, staff: { id: 1, name: 'Test Staff' } };
      mockPrismaService.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockProfile);
      expect(mockPrismaService.profile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { staff: true },
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkStaff', () => {
    const linkStaffDto = { profileId: 'profile-1', staffId: 1 };

    it('should link staff to profile successfully', async () => {
      mockPrismaService.profile.findUnique
        .mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' }) // Profile exists
        .mockResolvedValueOnce(null); // No existing link

      const linkedProfile = { id: 'profile-1', staffId: 1, staff: { id: 1, name: 'Staff' } };
      mockPrismaService.profile.update.mockResolvedValue(linkedProfile);

      const result = await service.linkStaff(linkStaffDto);

      expect(result).toEqual(linkedProfile);
      expect(mockPrismaService.profile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: { staffId: 1 },
        include: { staff: true },
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.profile.findUnique.mockResolvedValueOnce(null);

      await expect(service.linkStaff(linkStaffDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if staff already linked to another profile', async () => {
      mockPrismaService.profile.findUnique
        .mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'profile-2', userId: 'user-2' }); // Different profile has staff

      await expect(service.linkStaff(linkStaffDto)).rejects.toThrow(ConflictException);
    });

    it('should allow re-linking same profile to same staff', async () => {
      mockPrismaService.profile.findUnique
        .mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' })
        .mockResolvedValueOnce({ id: 'profile-1', staffId: 1 }); // Same profile

      const linkedProfile = { id: 'profile-1', staffId: 1, staff: { id: 1 } };
      mockPrismaService.profile.update.mockResolvedValue(linkedProfile);

      const result = await service.linkStaff(linkStaffDto);

      expect(result).toEqual(linkedProfile);
    });
  });

  describe('getUsersWithRoles', () => {
    it('should return all users with roles and profiles', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', roles: [{ role: 'admin' }], profile: { staffId: 1 } },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsersWithRoles();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        include: {
          roles: true,
          profile: { include: { staff: true } },
        },
      });
    });
  });

  describe('addRole', () => {
    const addRoleDto = { role: 'admin' as const };

    it('should add role to user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrismaService.userRole.findUnique.mockResolvedValue(null);
      const newRole = { id: 'role-1', userId: 'user-1', role: 'admin' };
      mockPrismaService.userRole.create.mockResolvedValue(newRole);

      const result = await service.addRole('user-1', addRoleDto);

      expect(result).toEqual(newRole);
      expect(mockPrismaService.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', role: 'admin' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.addRole('non-existent', addRoleDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user already has role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.userRole.findUnique.mockResolvedValue({ id: 'role-1', role: 'admin' });

      await expect(service.addRole('user-1', addRoleDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user successfully', async () => {
      const existingRole = { id: 'role-1', userId: 'user-1', role: 'admin' };
      mockPrismaService.userRole.findUnique.mockResolvedValue(existingRole);
      mockPrismaService.userRole.delete.mockResolvedValue(existingRole);

      const result = await service.removeRole('user-1', 'admin');

      expect(result).toEqual(existingRole);
      expect(mockPrismaService.userRole.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });

    it('should throw NotFoundException if role not found', async () => {
      mockPrismaService.userRole.findUnique.mockResolvedValue(null);

      await expect(service.removeRole('user-1', 'admin')).rejects.toThrow(NotFoundException);
    });
  });
});
