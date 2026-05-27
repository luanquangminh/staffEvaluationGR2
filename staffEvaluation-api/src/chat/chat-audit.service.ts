import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class ChatAuditService {
  private readonly logger = new Logger(ChatAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.chatAuditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          target: entry.target,
          details: entry.details ? JSON.stringify(entry.details) : null,
        },
      });
      this.logger.log(
        `AUDIT: user=${entry.userId} action=${entry.action} target=${entry.target}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${(error as Error).message}`,
      );
    }
  }
}
