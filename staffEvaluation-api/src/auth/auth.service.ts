import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, Profile, UserRole } from '@prisma/client';

type UserWithRelations = User & {
  profile: Profile | null;
  roles: UserRole[];
};

@Injectable()
export class AuthService {
  private readonly refreshTokenSecret: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    this.refreshTokenSecret = jwtSecret + '-refresh';
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: {
          create: {},
        },
        roles: {
          create: { role: 'user' },
        },
      },
      include: {
        profile: true,
        roles: true,
      },
    });

    return this.generateTokenResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokenResponse(user);
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.generateTokenResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      staffId: user.profile?.staffId || null,
      roles: user.roles.map((r) => r.role),
      isAdmin: user.roles.some((r) => r.role === 'admin'),
    };
  }

  private generateTokenResponse(user: UserWithRelations) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      staffId: user.profile?.staffId || null,
      roles: user.roles.map((r) => r.role),
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.refreshTokenSecret,
      expiresIn: '7d', // Refresh token expires in 7 days
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        staffId: user.profile?.staffId || null,
        roles: user.roles.map((r) => r.role),
        isAdmin: user.roles.some((r) => r.role === 'admin'),
      },
    };
  }
}
