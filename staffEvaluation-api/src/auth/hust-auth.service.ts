import {
  Injectable,
  UnauthorizedException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HustAuthService {
  private readonly logger = new Logger(HustAuthService.name);
  private readonly toolhubBaseUrl = 'https://api.toolhub.app';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify HUST credentials via ToolHub API.
   * The password is forwarded to ToolHub and immediately discarded — never stored.
   *
   * Security note: ToolHub's API requires credentials as GET query params (third-party
   * constraint). The request is server-to-server over HTTPS. A sanitized URL (password
   * replaced with "***") is used in all log statements so credentials never appear in logs,
   * even if fetch throws a network-level error that includes the request URL in its message.
   */
  async verifyCredentials(email: string, password: string): Promise<boolean> {
    const url = new URL('/hust/KiemTraMatKhau', this.toolhubBaseUrl);
    url.searchParams.set('taikhoan', email);
    url.searchParams.set('matkhau', password);

    // Sanitized version for logging — password is never logged
    const sanitizedUrl = new URL('/hust/KiemTraMatKhau', this.toolhubBaseUrl);
    sanitizedUrl.searchParams.set('taikhoan', email);
    sanitizedUrl.searchParams.set('matkhau', '***');

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (!response.ok) {
        this.logger.error(`ToolHub API error: HTTP ${response.status} — ${sanitizedUrl}`);
        throw new ServiceUnavailableException('HUST authentication service is temporarily unavailable');
      }

      const body = await response.text();
      return body.trim() === '1';
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      // Log only the error message — never the raw error object, which may embed the
      // credential URL in its stack trace or message (e.g. Node.js fetch network errors).
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`ToolHub API request failed — ${sanitizedUrl}: ${errMsg}`);
      throw new ServiceUnavailableException('HUST authentication service is temporarily unavailable');
    }
  }

  validateHustDomain(email: string): boolean {
    return /^[^@]+@([a-z0-9-]+\.)?hust\.edu\.vn$/i.test(email);
  }

  async findOrCreateUser(email: string) {
    const normalizedEmail = email.toLowerCase();

    // 1. Check if user already exists by email
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true, roles: true },
    });

    if (existing) {
      // Update provider to 'hust' if it was 'local' (link account)
      if (existing.provider === 'local') {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { provider: 'hust' },
          include: { profile: true, roles: true },
        });
      }
      return existing;
    }

    // 2. Create new user
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: null,
          provider: 'hust',
          profile: { create: {} },
          roles: { create: { role: 'user' } },
        },
        include: { profile: true, roles: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Race condition — another request created the user
        const retried = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { profile: true, roles: true },
        });
        if (retried) return retried;
      }
      throw error;
    }

    // 3. Auto-link to Staff by schoolEmail (only if exactly one match)
    const matchingStaff = await this.prisma.staff.findMany({
      where: { schoolEmail: normalizedEmail },
      include: { profile: true },
      take: 2,
    });

    const staff = matchingStaff.length === 1 ? matchingStaff[0] : null;

    if (staff && !staff.profile) {
      try {
        await this.prisma.profile.update({
          where: { userId: user.id },
          data: { staffId: staff.id },
        });

        return this.prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          include: { profile: true, roles: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return user; // Staff already linked by concurrent request
        }
        throw error;
      }
    }

    return user;
  }

  /**
   * Full login flow: validate domain → verify via ToolHub → find/create user.
   */
  async login(email: string, password: string) {
    if (!this.validateHustDomain(email)) {
      throw new UnauthorizedException(
        'Vui lòng sử dụng email HUST (@hust.edu.vn hoặc @sis.hust.edu.vn)',
      );
    }

    const isValid = await this.verifyCredentials(email, password);
    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu HUST không đúng');
    }

    return this.findOrCreateUser(email);
  }
}
