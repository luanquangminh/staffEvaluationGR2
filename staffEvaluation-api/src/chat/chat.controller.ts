import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as express from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message to the AI chatbot' })
  @ApiResponse({ status: 200, description: 'Chat reply from the AI model' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chat(
    @Body() dto: CreateChatDto,
    @CurrentUser() user: JwtPayload & { id: string },
  ) {
    const isAdmin = user.roles?.includes('admin') ?? false;
    return this.chatService.chat(
      user.id,
      dto.message,
      dto.conversationHistory,
      isAdmin,
    );
  }

  @Post('stream')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send a message to the AI chatbot (SSE stream)' })
  @ApiResponse({ status: 200, description: 'Server-Sent Events stream of chat tokens' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chatStream(
    @Body() dto: CreateChatDto,
    @CurrentUser() user: JwtPayload & { id: string },
    @Res() res: express.Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const isAdmin = user.roles?.includes('admin') ?? false;

    try {
      const stream = this.chatService.chatStream(
        user.id,
        dto.message,
        dto.conversationHistory,
        isAdmin,
      );

      for await (const chunk of stream) {
        res.write(`data: ${chunk}\n\n`);
      }
    } catch (error) {
      this.logger.error(`Stream error for user=${user.id}: ${(error as Error).message}`);
      res.write(
        `data: ${JSON.stringify({ type: 'error', content: 'Đã xảy ra lỗi khi xử lý yêu cầu.' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
