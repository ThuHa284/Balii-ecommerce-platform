import { Injectable } from '@nestjs/common';
import { CatalogKnowledgeService } from './catalog-knowledge.service';
import { ChatHistoryMessageDto, ChatRequestDto } from './dto/chat-request.dto';
import { GenerativeChatService } from './generative-chat.service';
import { ProductContext } from './knowledge.types';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';

@Injectable()
export class ChatbotServiceService {
  constructor(
    private readonly catalogKnowledgeService: CatalogKnowledgeService,
    private readonly generativeChatService: GenerativeChatService,
    private readonly qdrantVectorStoreService: QdrantVectorStoreService,
  ) {}

  async chat(dto: ChatRequestDto) {
    const history = dto.history ?? [];
    const message = dto.message?.trim() || '';
    const retrieval =
      (await this.qdrantVectorStoreService.search(message)) ||
      (await this.catalogKnowledgeService.searchByKeyword(message));
    const context = retrieval.documents.map(
      (document) => `${document.title}: ${document.content}`,
    );
    const generatedAnswer = await this.generativeChatService.generateAnswer({
      message,
      history,
      context,
    });

    const assistantContent = this.finalizeAnswer(
      generatedAnswer ||
        this.buildFallbackAnswer(message, context, retrieval.suggestedProducts),
      retrieval.suggestedProducts,
    );

    const assistantMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant' as const,
      content: assistantContent,
      timestamp: new Date().toISOString(),
      productSuggestions: retrieval.suggestedProducts.map((product) => ({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        thumbnail: product.thumbnail,
        price: product.salePrice ?? product.price,
        reason: this.buildSuggestionReason(product),
      })),
    };

    return {
      success: true,
      message: `Chatbot response generated successfully via ${retrieval.retrievalMode} retrieval`,
      data: assistantMessage,
    };
  }

  async recommend(history?: ChatHistoryMessageDto[]) {
    const lastUserMessage = [...(history ?? [])]
      .reverse()
      .find((item) => item.role === 'user' && item.content?.trim());
    const query =
      lastUserMessage?.content?.trim() || 'đồ ngủ mềm thoáng dễ mặc';
    const retrieval =
      (await this.qdrantVectorStoreService.search(query)) ||
      (await this.catalogKnowledgeService.searchByKeyword(query));

    return {
      success: true,
      message: 'Recommendations generated successfully',
      data: retrieval.suggestedProducts.map((product) => ({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        thumbnail: product.thumbnail,
        price: product.price,
        salePrice: product.salePrice,
        score: 0.9,
      })),
    };
  }

  async reindex() {
    await this.qdrantVectorStoreService.reindex();

    return {
      success: true,
      message: 'Chatbot vector index rebuilt successfully',
      data: {
        collection: 'balii_chatbot_knowledge',
      },
    };
  }

  private buildFallbackAnswer(
    message: string,
    context: string[],
    suggestedProducts: ProductContext[],
  ) {
    if (!context.length && !suggestedProducts.length) {
      return `Mình chưa thấy mẫu thật sự khớp với "${message}". Bạn muốn ưu tiên chất liệu hay tầm giá nào nhé?`;
    }

    const productHint = suggestedProducts.length
      ? `Mình thấy ${suggestedProducts.length} mẫu khá phù hợp với nhu cầu của bạn.`
      : '';
    const contextHint = context[0] ? `Bạn có thể tham khảo: ${context[0]}` : '';

    return [productHint, contextHint].filter(Boolean).join(' ');
  }

  private finalizeAnswer(
    rawAnswer: string,
    suggestedProducts: ProductContext[],
  ) {
    const sanitized = rawAnswer
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\b(CONTEXT|HISTORY|CUSTOMER|SYSTEM|PROMPT)\s*:/gi, ' ')
      .replace(/\b(user|assistant)\s*:/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const answer =
      sanitized ||
      'Mình đang lọc lại gợi ý phù hợp hơn cho bạn. Bạn thích kiểu dáng rộng rãi hay ôm gọn hơn?';

    if (!suggestedProducts.length) {
      return answer;
    }

    const mentionedProduct = suggestedProducts.some((product) =>
      answer.toLowerCase().includes(product.name.toLowerCase()),
    );

    if (mentionedProduct) {
      return answer;
    }

    return `${answer} Mình có gợi ý sẵn vài mẫu bên dưới để bạn mở nhanh trang sản phẩm.`;
  }

  private buildSuggestionReason(product: ProductContext) {
    if (product.salePrice && product.salePrice < product.price) {
      return 'Giá hiện tại tốt hơn giá gốc';
    }

    return 'Khá phù hợp với nhu cầu bạn đang hỏi';
  }
}
