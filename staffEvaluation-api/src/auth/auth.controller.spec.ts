import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getMe: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{
          ttl: 60000,
          limit: 10,
        }]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = { email: 'test@example.com', password: 'Password123' };
      const mockResponse = {
        accessToken: 'jwt-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          staffId: null,
          roles: ['user'],
          isAdmin: false,
        },
      };
      mockAuthService.register.mockResolvedValue(mockResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'Password123' };
      const mockResponse = {
        accessToken: 'jwt-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          staffId: 1,
          roles: ['user'],
          isAdmin: false,
        },
      };
      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return admin user with isAdmin true', async () => {
      const loginDto = { email: 'admin@example.com', password: 'Admin123' };
      const mockResponse = {
        accessToken: 'jwt-token',
        user: {
          id: 'user-456',
          email: 'admin@example.com',
          staffId: 1,
          roles: ['admin', 'user'],
          isAdmin: true,
        },
      };
      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto);

      expect(result.user.isAdmin).toBe(true);
    });
  });

  describe('getMe', () => {
    it('should return current user info', async () => {
      const mockUser = { id: 'user-123', sub: 'user-123', email: 'test@example.com' };
      const mockResponse = {
        id: 'user-123',
        email: 'test@example.com',
        staffId: 1,
        roles: ['user'],
        isAdmin: false,
      };
      mockAuthService.getMe.mockResolvedValue(mockResponse);

      const result = await controller.getMe(mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.getMe).toHaveBeenCalledWith('user-123');
    });

    it('should return admin user', async () => {
      const mockUser = { id: 'admin-123', sub: 'admin-123', email: 'admin@example.com' };
      const mockResponse = {
        id: 'admin-123',
        email: 'admin@example.com',
        staffId: 1,
        roles: ['admin'],
        isAdmin: true,
      };
      mockAuthService.getMe.mockResolvedValue(mockResponse);

      const result = await controller.getMe(mockUser);

      expect(result.isAdmin).toBe(true);
    });
  });

  describe('refresh', () => {
    it('should refresh token', async () => {
      const mockUser = { id: 'user-123', sub: 'user-123', email: 'test@example.com' };
      const refreshDto = { refreshToken: 'valid-refresh-token' };
      const mockResponse = {
        accessToken: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          staffId: 1,
          roles: ['user'],
          isAdmin: false,
        },
      };
      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      const result = await controller.refresh(refreshDto, mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('user-123');
    });

    it('should return new token with same user data', async () => {
      const mockUser = { id: 'user-123', sub: 'user-123', email: 'test@example.com' };
      const refreshDto = { refreshToken: 'valid-refresh-token' };
      const mockResponse = {
        accessToken: 'refreshed-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        user: { id: 'user-123', email: 'test@example.com', staffId: 1 },
      };
      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      const result = await controller.refresh(refreshDto, mockUser);

      expect(result.accessToken).toBe('refreshed-token');
      expect(result.user.id).toBe('user-123');
    });
  });
});
