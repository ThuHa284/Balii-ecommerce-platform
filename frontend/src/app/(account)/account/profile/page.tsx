"use client";

import { FormEvent, useEffect, useState } from "react";
import { User, Mail, Phone, Camera } from "lucide-react";
import { toast } from "sonner";
import { getProfileApi, updateProfileApi } from "@/lib/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState(() => user?.fullName ?? "");
  const [email, setEmail] = useState(() => user?.email ?? "");
  const [phone, setPhone] = useState(() => user?.phone ?? "");
  const [createdAt, setCreatedAt] = useState(() => user?.createdAt ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true);
        const profile = await getProfileApi();
        setUser(profile);
        setFullName(profile.fullName ?? "");
        setEmail(profile.email ?? "");
        setPhone(profile.phone ?? "");
        setCreatedAt(profile.createdAt ?? "");
      } catch {
        toast.error("Không tải được thông tin tài khoản.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [setUser]);

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase())
      .join("") || "TK";

  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("vi-VN")
    : "--/--/----";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      const updatedUser = await updateProfileApi({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setUser(updatedUser);
      setFullName(updatedUser.fullName ?? "");
      setEmail(updatedUser.email ?? "");
      setPhone(updatedUser.phone ?? "");
      setCreatedAt(updatedUser.createdAt ?? "");
      toast.success("Đã cập nhật thông tin tài khoản.");
    } catch {
      toast.error("Cập nhật thông tin thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-card p-8">
      <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
        Thông tin cá nhân
      </h1>

      <div className="mb-8 flex items-center gap-6 border-b border-white/30 pb-8">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-500 text-2xl font-bold text-white">
            {initials}
          </div>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 rounded-full border border-violet-200 bg-white p-1.5 shadow-lg transition-transform hover:scale-110"
          >
            <Camera className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
        <div>
          <h2 className="text-lg font-medium text-foreground">
            {fullName || "Tài khoản"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Thành viên từ {memberSince}
          </p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Họ và tên
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              disabled={isLoading || isSaving}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-xl border border-white/50 bg-white/60 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Số điện thoại
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-white/50 bg-white/60 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              disabled={isLoading || isSaving}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Đang cập nhật..." : "Cập nhật thông tin"}
        </button>
      </form>
    </div>
  );
}
