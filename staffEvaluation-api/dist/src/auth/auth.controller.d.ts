import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './strategies/jwt.strategy';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
    getMe(user: JwtPayload & {
        id: string;
    }): Promise<{
        id: string;
        email: string;
        staffId: number | null;
        roles: import("@prisma/client").$Enums.AppRole[];
        isAdmin: boolean;
    }>;
    refresh(dto: RefreshTokenDto, user: JwtPayload & {
        id: string;
    }): Promise<{
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
}
