import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatToolsService } from './chat-tools.service';
import { ChatAuditService } from './chat-audit.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatToolsService, ChatAuditService],
  exports: [ChatService],
})
export class ChatModule {}
