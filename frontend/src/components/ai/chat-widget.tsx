'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/types/ai.types';
import { sendChatMessage } from '@/lib/api/ai.api';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const MARKETPLACE_LINKS = [
  {
    href: 'https://shopee.vn',
    label: 'Shopee',
    bgClass: 'bg-orange-500 hover:bg-orange-600 shadow-orange-300/30',
    logo: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M12 2C9.243 2 7 4.243 7 7h2c0-1.654 1.346-3 3-3s3 1.346 3 3h2c0-2.757-2.243-5-5-5zM4 7l-1 17h18L20 7H4zm8 12c-3.038 0-5.5-2.239-5.5-5h2c0 1.654 1.57 3 3.5 3s3.5-1.346 3.5-3h2c0 2.761-2.462 5-5.5 5z" />
      </svg>
    ),
  },
  {
    href: 'https://vt.tiktok.com/ZS96rgAn3T2Wn-lIlcD/',
    label: 'TikTok Shop',
    bgClass: 'bg-slate-900 hover:bg-black shadow-slate-400/20',
    logo: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.51a6.27 6.27 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.23 8.23 0 004.76 1.52V7.13a4.85 4.85 0 01-1-.44z" />
      </svg>
    ),
  },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là trợ lý AI của Balii Sleepwear.\nBạn cần tư vấn gì về đồ ngủ không?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage.content, messages);
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau nhé!',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating widget stack — bottom right */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-center gap-3">
        {/* Chatbot toggle — primary, always at bottom */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'rounded-full bg-violet-500 p-4 text-white shadow-2xl shadow-violet-400/30 transition-all duration-300',
            'hover:scale-110 active:scale-95 hover:shadow-violet-400/40',
            isOpen && 'rotate-90',
          )}
          aria-label="Mở chat hỗ trợ"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </button>

        {/* Marketplace circular icon buttons */}
        {MARKETPLACE_LINKS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full shadow-xl transition-all duration-300 hover:scale-110 active:scale-95',
              item.bgClass,
            )}
            aria-label={item.label}
            title={item.label}
          >
            {item.logo}
          </a>
        ))}
      </div>

      {/* Chat panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-40 max-h-[500px] w-[360px] overflow-hidden glass-card transition-all duration-300',
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0',
        )}
      >
        <div className="bg-violet-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">Trợ lý Balii AI</h3>
              <p className="text-xs text-white/80">Tư vấn đồ ngủ thông minh</p>
            </div>
          </div>
        </div>

        <div className="h-80 space-y-4 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'rounded-br-md bg-violet-500 text-white'
                    : 'rounded-bl-md bg-white/70 text-foreground',
                )}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.productSuggestions &&
                  msg.productSuggestions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.productSuggestions.map((suggestion) => (
                        <Link
                          key={suggestion.productId}
                          href={
                            suggestion.productSlug
                              ? `/products/${suggestion.productSlug}`
                              : '#'
                          }
                          className="block rounded-lg bg-white/50 p-2 transition-colors hover:bg-white/80"
                        >
                          <p className="text-xs font-medium text-foreground">
                            {suggestion.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.reason}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white/70 px-4 py-3">
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/30 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-xl bg-violet-500 p-2.5 text-white transition-all hover:scale-105 hover:bg-violet-600 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
