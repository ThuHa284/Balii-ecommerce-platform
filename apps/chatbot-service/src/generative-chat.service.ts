import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatHistoryMessageDto } from './dto/chat-request.dto';

@Injectable()
export class GenerativeChatService {
  private readonly logger = new Logger(GenerativeChatService.name);
  private readonly modelName: string;
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  async generateAnswer(input: {
    message: string;
    history: ChatHistoryMessageDto[];
    context: string[];
  }) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const client = new GoogleGenerativeAI(this.apiKey);
      const model = client.getGenerativeModel({ model: this.modelName });
      const prompt = this.buildPrompt(input);
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      return text || null;
    } catch (error) {
      this.logger.warn(
        `Gemini generation failed, falling back to template response: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private buildPrompt(input: {
    message: string;
    history: ChatHistoryMessageDto[];
    context: string[];
  }) {
    const historyText = input.history
      .slice(-6)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    return `
Bạn là trợ lý tư vấn bán hàng của Balii Sleepwear.

Mục tiêu:
- Trả lời bằng tiếng Việt tự nhiên, dịu dàng, gần gũi và chuyên nghiệp.
- Tạo cảm giác như một nhân viên tư vấn tinh tế đang trò chuyện với khách, không máy móc hay quá cứng.
- Tập trung hỗ trợ khách chọn sản phẩm phù hợp, hiểu chất liệu, kiểu dáng, mức giá và nhu cầu sử dụng.

Nguyên tắc phản hồi:
- Khi phù hợp, mở đầu nhẹ nhàng bằng các cách nói như "Mình gợi ý bạn...", "Nếu bạn thích cảm giác...", "Bạn có thể tham khảo...".
- Giữ câu trả lời ngắn gọn vừa đủ, thường 2-5 câu, tránh liệt kê dày đặc.
- Chỉ dùng thông tin trong CONTEXT khi nói chi tiết về sản phẩm, giá hoặc chính sách.
- Nếu thiếu dữ liệu, nói rõ một cách mềm mại và hỏi thêm 1-2 thông tin thật cần thiết.
- Không bịa thông tin về tồn kho, vận chuyển, đổi trả hay ưu đãi nếu CONTEXT không có.
- Nếu có sản phẩm phù hợp trong CONTEXT, ưu tiên nhắc tên sản phẩm và lý do phù hợp với nhu cầu khách.
- Hạn chế giọng điệu mệnh lệnh, phán đoán chắc chắn hoặc quá quảng cáo.
- Ưu tiên xưng hô "mình" và "bạn".

Định dạng mong muốn:
- Có thể bắt đầu bằng một câu đồng cảm hoặc định hướng ngắn.
- Sau đó đưa ra gợi ý chính.
- Nếu cần, kết lại bằng một câu hỏi nhẹ để hiểu thêm nhu cầu.

CONTEXT:
${input.context.map((item, index) => `${index + 1}. ${item}`).join('\n')}

HISTORY:
${historyText || 'Chưa có lịch sử hội thoại.'}

CUSTOMER:
${input.message}
    `.trim();
  }
}
