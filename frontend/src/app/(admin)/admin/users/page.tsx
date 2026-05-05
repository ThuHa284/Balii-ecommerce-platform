"use client";

import { Search, Eye, Ban } from "lucide-react";
import { useState } from "react";

const mockUsers = [
  { id: "usr_001", fullName: "Nguyễn Văn An", email: "nguyen@example.com", phone: "0901234567", orders: 5, totalSpent: 4500000, isActive: true, createdAt: "2024-01-15" },
  { id: "usr_002", fullName: "Trần Thị Bình", email: "tran@example.com", phone: "0912345678", orders: 3, totalSpent: 2800000, isActive: true, createdAt: "2024-02-10" },
  { id: "usr_003", fullName: "Lê Văn Cường", email: "le@example.com", phone: "0923456789", orders: 1, totalSpent: 950000, isActive: true, createdAt: "2024-03-05" },
  { id: "usr_004", fullName: "Phạm Thị Dung", email: "pham@example.com", phone: "0934567890", orders: 8, totalSpent: 7200000, isActive: false, createdAt: "2024-01-20" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const filtered = mockUsers.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search));

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Quản lý khách hàng</h1>
      <p className="text-muted-foreground mb-8">{mockUsers.length} khách hàng</p>
      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
        </div>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/30">
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Khách hàng</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">SĐT</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Đơn hàng</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Tổng chi</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 flex items-center justify-center text-white text-sm font-bold">{user.fullName.charAt(0)}</div>
                    <div><p className="text-sm font-medium">{user.fullName}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{user.phone}</td>
                <td className="px-6 py-4 text-sm">{user.orders}</td>
                <td className="px-6 py-4 text-sm font-medium text-primary">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(user.totalSpent)}</td>
                <td className="px-6 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{user.isActive ? "Hoạt động" : "Bị khóa"}</span></td>
                <td className="px-6 py-4 text-right"><div className="flex justify-end gap-1"><button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-4 h-4" /></button><button className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Ban className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
