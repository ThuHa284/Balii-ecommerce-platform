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

    const assistantMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant' as const,
      content:
        generatedAnswer ||
        this.buildFallbackAnswer(message, context, retrieval.suggestedProducts),
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
      return `Mình đã nhận câu hỏi "${message}". Hiện tại mình chưa thấy sản phẩm thật sự khớp trong dữ liệu, nhưng bạn có thể cho mình biết thêm về chất liệu, mức giá hoặc người mặc để mình gợi ý dịu và sát nhu cầu hơn nhé.`;
    }

    const productHint = suggestedProducts.length
      ? `Mình đang thấy ${suggestedProducts.length} lựa chọn khá phù hợp trong catalog của Balii.`
      : '';
    const contextHint = context[0]
      ? `Thông tin gần nhất mình tìm được là: ${context[0]}`
      : '';

    return [
      productHint,
      contextHint,
      'Nếu bạn muốn, mình có thể lọc tiếp theo chất liệu, tầm giá hoặc nhu cầu mặc mùa hè hay mùa đông để gợi ý sát hơn cho bạn.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildSuggestionReason(product: ProductContext) {
    if (product.salePrice && product.salePrice < product.price) {
      return 'Mức giá hiện tại đang tốt hơn giá gốc';
    }

    return 'Khá phù hợp với nội dung bạn đang tìm';
  }
}
