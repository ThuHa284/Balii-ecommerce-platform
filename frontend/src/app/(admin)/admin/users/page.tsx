"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Ban } from "lucide-react";
import { toast } from "sonner";
import { getAdminUsers, type AdminUser } from "@/lib/api/admin.api";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        setIsLoading(true);
        const data = await getAdminUsers();
        setUsers(data);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không tải được danh sách khách hàng.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUsers();
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.fullName.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, users],
  );

  return (
    <div>
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
        Quản lý khách hàng
      </h1>
      <p className="mb-8 text-muted-foreground">{users.length} khách hàng</p>

      <div className="glass-card mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/30">
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                Khách hàng
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                SDT
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                Đơn hàng
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                Tổng chi
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                Trạng thái
              </th>
              <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-muted-foreground"
                >
                  Đang tải danh sách khách hàng...
                </td>
              </tr>
            )}

            {!isLoading && filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy khách hàng phù hợp.
                </td>
              </tr>
            )}

            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/20 transition-colors hover:bg-white/30"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                      {getInitials(user.fullName || user.email)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Tham gia {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{user.phone || "--"}</td>
                <td className="px-6 py-4 text-sm">{user.orderCount ?? "--"}</td>
                <td className="px-6 py-4 text-sm font-medium text-primary">
                  {user.totalSpent != null ? formatCurrency(user.totalSpent) : "--"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.isActive ? "Hoạt động" : "Bị khóa"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50">
                      <Ban className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
