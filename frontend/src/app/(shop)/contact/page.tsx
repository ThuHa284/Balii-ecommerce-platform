"use client";

import { MessageCircle, ExternalLink, Send, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setName("");
      setEmail("");
      setMessage("");
      toast.success("Đã gửi tin nhắn hỗ trợ thành công! Chúng tôi sẽ phản hồi lại bạn sớm nhất.");
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 md:pt-28 pb-16 space-y-8 min-h-[75vh]">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Liên hệ với chúng tôi</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Balii Sleepwear vận hành trực tuyến 100% để tối ưu hóa giá thành sản phẩm tốt nhất.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Online Sales Channels */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h2 className="font-heading text-base sm:text-lg font-bold text-foreground flex items-center gap-2 border-b border-white/20 pb-2">
              <ShoppingBag className="w-5 h-5 text-violet-500 shrink-0" />
              Kênh mua sắm trực tuyến
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn có thể mua sắm sản phẩm lụa ngủ Balii, tham khảo đánh giá chân thực của hàng ngàn khách hàng khác tại các gian hàng thương mại chính thức:
            </p>

            <div className="space-y-3 pt-2">
              {/* Shopee Channel Button */}
              <a
                href="https://shopee.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-orange-200 bg-orange-50/35 hover:bg-orange-50/60 hover:scale-[1.01] active:scale-95 transition-all group gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    S
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-orange-800 truncate">Gian hàng Shopee Mall</h3>
                    <p className="text-[10px] text-orange-700/80 mt-0.5 leading-snug">Thời gian giao hàng cực nhanh, nhiều mã hoàn xu</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-600 transition-colors shrink-0" />
              </a>

              {/* TikTok Shop Button */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50/80 hover:scale-[1.01] active:scale-95 transition-all group gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-black text-[10px] shadow-sm shrink-0">
                    TikTok
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">Gian hàng TikTok Shop</h3>
                    <p className="text-[10px] text-slate-600/80 mt-0.5 leading-snug">Livestream tư vấn phom dáng, voucher trợ giá cực khủng</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
              </a>

              {/* Zalo Support */}
              <a
                href="https://zalo.me/0987654321"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/30 hover:bg-blue-50/60 hover:scale-[1.01] active:scale-95 transition-all group gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    Z
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-blue-800 truncate">Hỗ trợ tư vấn Zalo</h3>
                    <p className="text-[10px] text-blue-600/80 mt-0.5 leading-snug">Tư vấn size số, đổi trả hàng, phản ánh chất lượng</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Support Form */}
        <div>
          <form onSubmit={handleSendMessage} className="glass-card p-5 space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2 border-b border-white/20 pb-2">
              <MessageCircle className="w-5 h-5 text-violet-500" />
              Gửi tin nhắn cho Balii
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ tên của bạn"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Email liên hệ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground block">Nội dung tin nhắn</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập câu hỏi hoặc nội dung bạn cần hỗ trợ..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none text-foreground/90 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-md"
              >
                {isSending ? (
                  "Đang gửi tin nhắn..."
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Gửi phản hồi CSKH
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
