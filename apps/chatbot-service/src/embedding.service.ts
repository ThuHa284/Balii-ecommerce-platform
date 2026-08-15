import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { KnowledgeDocument } from './knowledge.types';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey?: string;
  private readonly embeddingModel: string;
  private lastError: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim();
    this.embeddingModel =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ||
      'models/gemini-embedding-001';
  }

  isEnabled() {
    return Boolean(this.apiKey);
  }

  getEmbeddingModel() {
    return this.embeddingModel;
  }

  getLastError() {
    return this.lastError;
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

    try {
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

      this.lastError = null;
      return response.embedding.values;
    } catch (error) {
      this.captureError('embedQuery', error);
      return null;
    }
  }

  async embedDocuments(documents: KnowledgeDocument[]) {
    if (!this.apiKey || !documents.length) {
      return null;
    }

    try {
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

      this.lastError = null;
      return vectors;
    } catch (error) {
      this.captureError('embedDocuments', error);
      return null;
    }
  }

  private captureError(operation: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.lastError = message;
    this.logger.error(
      `Gemini embedding ${operation} failed (vector RAG will degrade to keyword-only): ${message}`,
    );
  }

  private chunk<T>(items: T[], size: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
