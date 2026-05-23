import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Res,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { AuthService } from './auth.service';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import { HustAuthService } from './hust-auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { HustLoginDto } from './dto/hust-login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private authService: AuthService,
    private microsoftOAuthService: MicrosoftOAuthService,
    private hustAuthService: HustAuthService,
    private configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: JwtPayload & { id: string }) {
    return this.authService.getMe(user.id);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: JwtPayload & { id: string; tokenVersion?: number },
  ) {
    return this.authService.refreshToken(user.id, user.tokenVersion);
  }

  @Post('hust-login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Login with HUST email and password (verified via ToolHub API)' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid HUST credentials or non-HUST email' })
  @ApiResponse({ status: 503, description: 'HUST auth service unavailable' })
  async hustLogin(@Body() dto: HustLoginDto) {
    const user = await this.hustAuthService.login(dto.email, dto.password);
    return this.authService.generateTokenResponse(user);
  }

  @Get('microsoft')
  @ApiOperation({ summary: 'Redirect to Microsoft login page' })
  @ApiResponse({ status: 302, description: 'Redirect to Microsoft OAuth' })
  microsoftLogin(@Res() res: express.Response) {
    const url = this.microsoftOAuthService.getAuthorizationUrl();
    return res.redirect(url);
  }

  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: express.Response,
  ) {
    // Handle Microsoft error/cancel
    if (error) {
      this.logger.warn(`Microsoft OAuth error: ${error} - ${errorDescription}`);
      return res.redirect(
        `${this.frontendUrl}/auth/callback?error=${encodeURIComponent(error)}`,
      );
    }

    // Validate CSRF state parameter
    if (!this.microsoftOAuthService.validateState(state)) {
      this.logger.warn('Microsoft OAuth callback with invalid state parameter');
      return res.redirect(
        `${this.frontendUrl}/auth/callback?error=invalid_state`,
      );
    }

    if (!code) {
      return res.redirect(
        `${this.frontendUrl}/auth/callback?error=no_code`,
      );
    }

    try {
      // 1. Exchange code for Microsoft tokens
      const tokenResponse =
        await this.microsoftOAuthService.exchangeCode(code);

      // 2. Decode id_token
      const profile = this.microsoftOAuthService.decodeIdToken(
        tokenResponse.id_token,
      );

      // 3. Validate HUST domain
      if (!this.microsoftOAuthService.validateHustDomain(profile.email)) {
        return res.redirect(
          `${this.frontendUrl}/auth/callback?error=invalid_domain`,
        );
      }

      // 4. Find or create user
      const user = await this.microsoftOAuthService.findOrCreateUser(profile);

      // 5. Generate JWT tokens
      const tokens = this.authService.generateTokenResponse(user);

      // 6. Store tokens behind a one-time code so they don't leak in the URL
      const oneTimeCode = this.microsoftOAuthService.storeOneTimeCode(
        tokens.accessToken,
        tokens.refreshToken,
      );

      // 7. Redirect to frontend with the one-time code only
      return res.redirect(
        `${this.frontendUrl}/auth/callback?code=${oneTimeCode}`,
      );
    } catch (err) {
      this.logger.error('Microsoft OAuth callback error', err);
      return res.redirect(
        `${this.frontendUrl}/auth/callback?error=server_error`,
      );
    }
  }

  @Post('microsoft/token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Exchange one-time code for JWT tokens after Microsoft OAuth' })
  @ApiResponse({ status: 200, description: 'Returns access and refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  microsoftToken(@Body('code') code: string) {
    if (!code || typeof code !== 'string') {
      throw new UnauthorizedException('Invalid or expired code');
    }
    const tokens = this.microsoftOAuthService.consumeOneTimeCode(code);
    if (!tokens) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    return tokens;
  }
}
