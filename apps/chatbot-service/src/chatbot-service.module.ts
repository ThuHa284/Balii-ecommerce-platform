import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { loadEnv } from '@app/common';
import { CatalogKnowledgeService } from './catalog-knowledge.service';
import { ChatbotServiceController } from './chatbot-service.controller';
import { ChatbotServiceService } from './chatbot-service.service';
import { EmbeddingService } from './embedding.service';
import { GenerativeChatService } from './generative-chat.service';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';

loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    DatabaseModule,
  ],
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
