import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ChatbotServiceService } from './chatbot-service.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { HeaderRolesGuard } from './auth/header-roles.guard';

@Controller('chatbot')
export class ChatbotServiceController {
  constructor(private readonly chatbotService: ChatbotServiceService) {}

  @Get('health')
  health() {
    return this.chatbotService.getHealth();
  }

  @Get('diagnostics')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  diagnostics() {
    return this.chatbotService.getDiagnostics();
  }

  @Post('chat')
  chat(@Body() dto: ChatRequestDto) {
    return this.chatbotService.chat(dto);
  }

  @Post('recommendations')
  recommend(@Body() dto: Pick<ChatRequestDto, 'history'>) {
    return this.chatbotService.recommend(dto.history);
  }

  @Post('reindex')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  reindex() {
    return this.chatbotService.reindex();
  }
}
