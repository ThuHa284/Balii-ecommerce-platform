import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { KnowledgeDocument } from './knowledge.types';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey?: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.embeddingModel =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
      'models/gemini-embedding-001';
  }

  isEnabled() {
    return Boolean(this.apiKey);
  }

  logDisabledReason() {
    if (!this.apiKey) {
      this.logger.warn(
        'Gemini embedding is disabled because GEMINI_API_KEY is missing.',
      );
    }
  }

  async embedQuery(query: string) {
    if (!this.apiKey) {
      return null;
    }

    const model = new GoogleGenerativeAI(this.apiKey).getGenerativeModel({
      model: this.embeddingModel,
    });
    const response = await model.embedContent({
      content: {
        role: 'user',
        parts: [{ text: query }],
      },
      taskType: TaskType.RETRIEVAL_QUERY,
    });

    return response.embedding.values;
  }

  async embedDocuments(documents: KnowledgeDocument[]) {
    if (!this.apiKey || !documents.length) {
      return null;
    }

    const model = new GoogleGenerativeAI(this.apiKey).getGenerativeModel({
      model: this.embeddingModel,
    });
    const vectors: number[][] = [];

    for (const batch of this.chunk(documents, 20)) {
      const response = await model.batchEmbedContents({
        requests: batch.map((document) => ({
          content: {
            role: 'user',
            parts: [{ text: `${document.title}\n${document.content}` }],
          },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
          title: document.title,
        })),
      });

      vectors.push(...response.embeddings.map((item) => item.values));
    }

    return vectors;
  }

  private chunk<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
