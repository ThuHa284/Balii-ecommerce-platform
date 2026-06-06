'use client';

import { useState } from 'react';
import {
  ChevronDown,
  HelpCircle,
  MessageSquare,
  PhoneCall,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FAQItem[] = [
  {
    question: 'Kích cỡ (Size) đồ ngủ của Balii được chọn như thế nào?',
    answer:
      'Balii phân loại kích cỡ sản phẩm dựa trên cân nặng thực tế để mang lại cảm giác thoải mái nhất: Size S (từ 40kg - 47kg), Size M (từ 48kg - 53kg), Size L (từ 54kg - 60kg) và Size XL (từ 61kg - 70kg). Tại mỗi trang chi tiết sản phẩm, bạn có thể nhập cân nặng của mình vào ô gợi ý để AI tự động khuyên dùng size phù hợp nhất.',
  },
  {
    question: 'Đồ ngủ làm từ lụa tơ tằm cần giặt giũ và bảo quản như thế nào?',
    answer:
      'Chất liệu lụa Mulberry tự nhiên cao cấp rất mềm mại và nhạy cảm. Bạn nên giặt tay nhẹ nhàng bằng nước lạnh với sữa tắm hoặc dầu gội đầu, không dùng bột giặt có chất tẩy mạnh. Khi phơi nên phơi trong bóng râm, tránh ánh nắng mặt trời trực tiếp và là (ủi) ở nhiệt độ thấp nhất dành riêng cho lụa.',
  },
  {
    question: 'Chính sách đổi trả hàng của Balii Sleepwear hoạt động ra sao?',
    answer:
      'Balii hỗ trợ đổi size sản phẩm trong vòng 7 ngày kể từ khi nhận hàng. Sản phẩm đổi trả phải còn nguyên nhãn mác, chưa qua giặt giũ và không có mùi lạ. Do đồ ngủ là sản phẩm cá nhân nhạy cảm, chúng tôi không áp dụng hoàn trả lại tiền mặt ngoại trừ trường hợp lỗi sản phẩm phát sinh do nhà sản xuất.',
  },
  {
    question: 'Thời gian giao hàng mất bao lâu và phí ship tính thế nào?',
    answer:
      'Thời gian giao hàng tiêu chuẩn là 2-4 ngày làm việc trên toàn quốc. Đơn hàng nội thành Hà Nội/TP.HCM có thể giao hỏa tốc trong ngày. Balii áp dụng chính sách miễn phí vận chuyển cho toàn bộ đơn hàng có giá trị từ 500.000đ trở lên hoặc mua từ 2 sản phẩm chính.',
  },
  {
    question: 'Chức năng thử đồ ảo bằng AI hoạt động như thế nào?',
    answer:
      'Chức năng thử đồ ảo (AI Try-On) giúp bạn hình dung phom dáng sản phẩm khi mặc lên người. Bạn chỉ cần tải lên một bức ảnh chân dung rõ nét, hệ thống AI sẽ dựng hình và khoác bộ đồ ngủ bạn chọn lên người mẫu ảo. Bạn có thể chọn lưu ảnh kết quả vào lịch sử thử đồ cá nhân hoặc không lưu để bảo mật thông tin.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-[70vh] space-y-8 px-4 pt-24 pb-16 md:pt-28">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
          Trung tâm hỗ trợ
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Giải đáp các thắc mắc thường gặp và hỗ trợ tư vấn khách hàng
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-4">
        {FAQ_LIST.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={faq.question}
              className="glass-card overflow-hidden border border-white/50 transition-all duration-300"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-white/40 sm:px-5 sm:py-4 sm:text-base"
              >
                <span className="flex items-start gap-2.5">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 sm:h-5 sm:w-5" />
                  <span className="leading-snug">{faq.question}</span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 sm:h-5 sm:w-5 ${
                    isOpen ? 'rotate-180 text-violet-500' : ''
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen
                    ? 'max-h-[400px] border-t border-white/20 bg-white/20'
                    : 'max-h-0'
                }`}
              >
                <div className="p-4 text-xs leading-relaxed text-foreground/80 sm:p-5 sm:text-sm">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card mx-auto max-w-xl space-y-4 border border-violet-100/50 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-5 text-center sm:p-6">
        <div className="inline-flex rounded-full bg-violet-500/10 p-3 text-violet-600">
          <MessageSquare className="h-5 w-5 animate-bounce sm:h-6 sm:w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
            Bạn vẫn cần hỗ trợ trực tiếp?
          </h3>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            AI Agent và đội ngũ CSKH của Balii luôn túc trực hỗ trợ bạn 24/7 qua
            Zalo.
          </p>
        </div>
        <div>
          <a
            href="https://zalo.me/0987654321"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs shadow-md sm:text-sm"
          >
            <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Nhắn tin Zalo (0987 654 321)
          </a>
        </div>
      </div>
    </div>
  );
}
