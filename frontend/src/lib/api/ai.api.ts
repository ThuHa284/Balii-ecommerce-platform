import { ChatMessage, RecommendedProduct } from "@/types/ai.types";
import { ApiResponse } from "@/types/api.types";
import apiClient from "./client";
import { MOCK_PRODUCTS } from "./mock-data";

const USE_MOCK = false;

export async function sendChatMessage(message: string, history: ChatMessage[]): Promise<ChatMessage> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({
        id: `msg_${Date.now()}`, role: "assistant", content: `Cảm ơn bạn đã liên hệ Balii Sleepwear! Về câu hỏi "${message}", chúng tôi có nhiều mẫu đồ ngủ lụa cao cấp phù hợp với bạn. Bạn có thể xem thêm trong danh mục sản phẩm nhé! 💕`,
        timestamp: new Date().toISOString(), productSuggestions: [{ productId: MOCK_PRODUCTS[0].id, productName: MOCK_PRODUCTS[0].name, productSlug: MOCK_PRODUCTS[0].slug, thumbnail: MOCK_PRODUCTS[0].thumbnail, price: MOCK_PRODUCTS[0].salePrice || MOCK_PRODUCTS[0].basePrice, reason: "Sản phẩm bán chạy nhất" }],
      }), 1200)
    );
  }
  const { data } = await apiClient.post<ApiResponse<ChatMessage>>("/chatbot/chat", { message, history });
  return data.data;
}

export async function getRecommendations(userId?: string): Promise<RecommendedProduct[]> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(MOCK_PRODUCTS.slice(0, 4).map((p, i) => ({
        productId: p.id, productName: p.name, productSlug: p.slug, thumbnail: p.thumbnail,
        price: p.basePrice, salePrice: p.salePrice, score: 0.95 - i * 0.05,
      }))), 600)
    );
  }
  const { data } = await apiClient.post<ApiResponse<RecommendedProduct[]>>("/chatbot/recommendations", {
    history: userId
      ? [
          {
            id: "user_context",
            role: "user",
            content: userId,
            timestamp: new Date().toISOString(),
          },
        ]
      : [],
  });
  return data.data;
}
