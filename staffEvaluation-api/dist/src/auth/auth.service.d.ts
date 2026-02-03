import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private readonly refreshTokenSecret;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            staffId: number | null;
            roles: import("@prisma/client").$Enums.AppRole[];
            isAdmin: boolean;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            staffId: number | null;
            roles: import("@prisma/client").$Enums.AppRole[];
            isAdmin: boolean;
        };
    }>;
    refreshToken(userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: {
            id: string;
            email: string;
            staffId: number | null;
            roles: import("@prisma/client").$Enums.AppRole[];
            isAdmin: boolean;
        };
    }>;
    getMe(userId: string): Promise<{
        id: string;
        email: string;
        staffId: number | null;
        roles: import("@prisma/client").$Enums.AppRole[];
        isAdmin: boolean;
    }>;
    private generateTokenResponse;
}
