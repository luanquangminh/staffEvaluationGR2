import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { HustAuthService } from './hust-auth.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getMe: jest.fn(),
    refreshToken: jest.fn(),
    generateTokenResponse: jest.fn(),
  };

  const mockMicrosoftOAuthService = {
    getAuthorizationUrl: jest.fn(),
    exchangeCode: jest.fn(),
    decodeIdToken: jest.fn(),
    validateHustDomain: jest.fn(),
    validateState: jest.fn(),
    findOrCreateUser: jest.fn(),
    storeOneTimeCode: jest.fn(),
    consumeOneTimeCode: jest.fn(),
  };

  const mockHustAuthService = {
    login: jest.fn(),
    verifyCredentials: jest.fn(),
    validateHustDomain: jest.fn(),
    findOrCreateUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        FRONTEND_URL: 'http://localhost:5173',
      };
      return config[key];
    }),
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
        {
          provide: MicrosoftOAuthService,
          useValue: mockMicrosoftOAuthService,
        },
        {
          provide: HustAuthService,
          useValue: mockHustAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      const mockUser = { id: 'user-123', sub: 'user-123', email: 'test@example.com', staffId: 1, roles: ['user'] };
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
      const mockUser = { id: 'admin-123', sub: 'admin-123', email: 'admin@example.com', staffId: 1, roles: ['admin'] };
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
      const mockUser = { id: 'user-123', sub: 'user-123', email: 'test@example.com', staffId: 1, roles: ['user'], tokenVersion: 0 };
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
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('user-123', 0);
    });

    it('should return new token with same user data', async () => {
      const mockUser = { id: 'user-123', sub: 'user-123', email: 'test@example.com', staffId: 1, roles: ['user'], tokenVersion: 0 };
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

  describe('hustLogin', () => {
    it('should login with valid HUST credentials', async () => {
      const hustLoginDto = { email: 'user@sis.hust.edu.vn', password: 'hustpass' };
      const mockUser = { id: 'user-1', email: 'user@sis.hust.edu.vn', profile: null, roles: [{ role: 'user' }] };
      const mockTokenResponse = { accessToken: 'at', refreshToken: 'rt', expiresIn: 900, user: { id: 'user-1' } };

      mockHustAuthService.login.mockResolvedValue(mockUser);
      mockAuthService.generateTokenResponse.mockReturnValue(mockTokenResponse);

      const result = await controller.hustLogin(hustLoginDto);

      expect(mockHustAuthService.login).toHaveBeenCalledWith('user@sis.hust.edu.vn', 'hustpass');
      expect(mockAuthService.generateTokenResponse).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokenResponse);
    });

    it('should propagate UnauthorizedException from HustAuthService', async () => {
      const hustLoginDto = { email: 'user@gmail.com', password: 'pass' };
      mockHustAuthService.login.mockRejectedValue(
        new UnauthorizedException('Vui lòng sử dụng email HUST'),
      );

      await expect(controller.hustLogin(hustLoginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('microsoftLogin', () => {
    it('should redirect to Microsoft authorization URL', () => {
      mockMicrosoftOAuthService.getAuthorizationUrl.mockReturnValue('https://login.microsoft.com/authorize?...');
      const mockRes = { redirect: jest.fn() } as any;

      controller.microsoftLogin(mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith('https://login.microsoft.com/authorize?...');
    });
  });

  describe('microsoftCallback', () => {
    const mockRes = { redirect: jest.fn() } as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should redirect with error when Microsoft returns error', async () => {
      await controller.microsoftCallback(undefined as any, undefined as any, 'access_denied', 'User cancelled', mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=access_denied'),
      );
    });

    it('should redirect with error on invalid state', async () => {
      mockMicrosoftOAuthService.validateState.mockReturnValue(false);

      await controller.microsoftCallback('code123', 'bad-state', undefined as any, undefined as any, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_state'),
      );
    });

    it('should redirect with error when no code provided', async () => {
      mockMicrosoftOAuthService.validateState.mockReturnValue(true);

      await controller.microsoftCallback(undefined as any, 'valid-state', undefined as any, undefined as any, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=no_code'),
      );
    });

    it('should complete OAuth flow successfully', async () => {
      mockMicrosoftOAuthService.validateState.mockReturnValue(true);
      mockMicrosoftOAuthService.exchangeCode.mockResolvedValue({ id_token: 'id-token' });
      mockMicrosoftOAuthService.decodeIdToken.mockReturnValue({ email: 'user@hust.edu.vn', name: 'User' });
      mockMicrosoftOAuthService.validateHustDomain.mockReturnValue(true);
      mockMicrosoftOAuthService.findOrCreateUser.mockResolvedValue({
        id: 'user-1', email: 'user@hust.edu.vn', profile: null, roles: [{ role: 'user' }],
      });
      mockAuthService.generateTokenResponse.mockReturnValue({
        accessToken: 'at', refreshToken: 'rt', expiresIn: 900, user: {},
      });
      mockMicrosoftOAuthService.storeOneTimeCode.mockReturnValue('otc-123');

      await controller.microsoftCallback('code123', 'valid-state', undefined as any, undefined as any, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('code=otc-123'),
      );
    });

    it('should redirect with error on invalid domain', async () => {
      mockMicrosoftOAuthService.validateState.mockReturnValue(true);
      mockMicrosoftOAuthService.exchangeCode.mockResolvedValue({ id_token: 'id-token' });
      mockMicrosoftOAuthService.decodeIdToken.mockReturnValue({ email: 'user@gmail.com', name: 'User' });
      mockMicrosoftOAuthService.validateHustDomain.mockReturnValue(false);

      await controller.microsoftCallback('code123', 'valid-state', undefined as any, undefined as any, mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=invalid_domain'),
      );
    });
  });

  describe('microsoftToken', () => {
    it('should return tokens for valid one-time code', () => {
      const mockTokens = { accessToken: 'at', refreshToken: 'rt' };
      mockMicrosoftOAuthService.consumeOneTimeCode.mockReturnValue(mockTokens);

      const result = controller.microsoftToken('otc-123');

      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException for invalid code', () => {
      mockMicrosoftOAuthService.consumeOneTimeCode.mockReturnValue(null);

      expect(() => controller.microsoftToken('bad-code')).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for empty code', () => {
      expect(() => controller.microsoftToken(undefined as any)).toThrow(UnauthorizedException);
      expect(() => controller.microsoftToken('')).toThrow(UnauthorizedException);
    });
  });
});
