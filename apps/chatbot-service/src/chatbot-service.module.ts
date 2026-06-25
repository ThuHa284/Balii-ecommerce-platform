import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { CatalogKnowledgeService } from './catalog-knowledge.service';
import { ChatbotServiceController } from './chatbot-service.controller';
import { ChatbotServiceService } from './chatbot-service.service';
import { EmbeddingService } from './embedding.service';
import { GenerativeChatService } from './generative-chat.service';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
  controllers: [ChatbotServiceController],
  providers: [
    ChatbotServiceService,
    CatalogKnowledgeService,
    EmbeddingService,
    GenerativeChatService,
    QdrantVectorStoreService,
  ],
})
export class ChatbotServiceModule {}
