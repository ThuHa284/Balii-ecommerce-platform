/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class MarketAgentService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  async parseCommand(command: string) {
    const aiPrompt = `
Bạn là AI Agent cho hệ thống phân tích thị trường thời trang Balii SleepWear.

Nhiệm vụ:
- Hiểu yêu cầu người dùng bằng tiếng Việt tự nhiên.
- Xác định hành động cần thực hiện.
- Trích xuất keyword sản phẩm.
- Xác định nguồn dữ liệu phù hợp.
- Có thể suy luận nếu user không ghi rõ nguồn.

Actions hợp lệ:
- crawl_online
- analyze_price
- crawl_and_analyze
- get_products
- compare_platforms
- recommend_price

Sources hợp lệ:
- canifa
- sunfly
- tiktok_shop
- shopee
- website

Rules:
- Nếu user yêu cầu "phân tích", dùng analyze_price.
- Nếu user yêu cầu "crawl + phân tích", dùng crawl_and_analyze.
- Nếu user yêu cầu "xem sản phẩm", dùng get_products.
- Nếu user yêu cầu "so sánh nguồn/platform", dùng compare_platforms.
- Nếu user yêu cầu "đề xuất giá bán", dùng recommend_price.
- Nếu user không ghi nguồn:
  → tự chọn nguồn phù hợp.
- Nếu user nhắc TikTok:
  → thêm source "tiktok_shop".
- Nếu user nhắc Shopee:
  → thêm source "shopee".

Input user:
"${command}"

Chỉ trả JSON hợp lệ, không markdown, không giải thích.

Format:
{
  "action": "",
  "keyword": "",
  "sources": [],
  "minPrice": null,
  "maxPrice": null,
  "limit": 20
}
`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });

      const result = await model.generateContent(aiPrompt);

      const text = result.response.text();

      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (error) {
      console.error('Gemini parseCommand failed:', error);

      return {
        action: 'crawl_and_analyze',
        keyword: command.includes('đồ ngủ') ? 'đồ mặc nhà nữ' : command,
        sources: ['canifa', 'sunfly'],
        minPrice: null,
        maxPrice: null,
        limit: 20,
        fallback: true,
      };
    }
  }

  async generateInsight(analysis: any) {
    if (!process.env.GEMINI_API_KEY) {
      return this.generateFallbackInsight(analysis);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });

      const aiPrompt = `
Bạn là AI phân tích giá thị trường cho shop đồ ngủ Balii SleepWear.
Dựa vào dữ liệu sau:
${JSON.stringify(analysis)}

Trả về JSON:
{
  "summary": "",
  "pricingSuggestion": "",
  "competitiveLevel": "",
  "adminAction": ""
}
`;

      const result = await model.generateContent(aiPrompt);
      const text = result.response.text();

      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return this.generateFallbackInsight(analysis);
    }
  }

  private generateFallbackInsight(analysis: any) {
    const avg = analysis.marketInsight?.averagePrice || 0;
    const recommended = analysis.marketInsight?.recommendedSellPrice || 0;

    return {
      summary: `Đã phân tích ${analysis.totalProducts} sản phẩm, giá trung bình khoảng ${avg.toLocaleString('vi-VN')}đ.`,
      pricingSuggestion: `Có thể đặt giá bán tham khảo khoảng ${recommended.toLocaleString('vi-VN')}đ.`,
      competitiveLevel:
        avg < 250000 ? 'Bình dân' : avg < 400000 ? 'Trung bình' : 'Cao cấp',
      adminAction:
        'Nên lọc thêm theo nguồn, chất liệu và khoảng giá để ra quyết định chính xác hơn.',
      fallback: true,
    };
  }
}
