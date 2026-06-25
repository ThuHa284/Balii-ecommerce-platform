import { Body, Controller, Get, Post } from '@nestjs/common';
import { ChatbotServiceService } from './chatbot-service.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chatbot')
export class ChatbotServiceController {
  constructor(private readonly chatbotService: ChatbotServiceService) {}

  @Get('health')
  health() {
    return {
      success: true,
      message: 'Chatbot service is healthy',
      data: {
        status: 'ok',
      },
    };
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
  reindex() {
    return this.chatbotService.reindex();
  }
}
