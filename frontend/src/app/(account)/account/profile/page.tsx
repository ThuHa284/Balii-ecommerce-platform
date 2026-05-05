"use client";

import { User, Mail, Phone, Camera } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="glass-card p-8">
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Thông tin cá nhân</h1>

      {/* Avatar */}
      <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/30">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 flex items-center justify-center text-white text-2xl font-bold">
            NA
          </div>
          <button className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white shadow-lg border border-pink-200 hover:scale-110 transition-transform">
            <Camera className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-medium text-foreground">Nguyễn Văn An</h2>
          <p className="text-sm text-muted-foreground">Thành viên từ 15/01/2024</p>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Họ và tên</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" defaultValue="Nguyễn Văn An" className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="email" defaultValue="nguyen@example.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" readOnly />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Số điện thoại</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="tel" defaultValue="0901234567" className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
          </div>
        </div>
        <button type="submit" className="btn-primary">Cập nhật thông tin</button>
      </form>
    </div>
  );
}
