import { ChatMessage, RecommendedProduct } from '@/types/ai.types';
import { ApiResponse } from '@/types/api.types';
import apiClient from './client';

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
): Promise<ChatMessage> {
  const { data } = await apiClient.post<ApiResponse<ChatMessage>>(
    '/chatbot/chat',
    { message, history },
  );
  return data.data;
}

export async function getRecommendations(
  userId?: string,
): Promise<RecommendedProduct[]> {
  const { data } = await apiClient.post<ApiResponse<RecommendedProduct[]>>(
    '/chatbot/recommendations',
    {
      history: userId
        ? [
            {
              id: 'user_context',
              role: 'user',
              content: userId,
              timestamp: new Date().toISOString(),
            },
          ]
        : [],
    },
  );
  return data.data;
}
