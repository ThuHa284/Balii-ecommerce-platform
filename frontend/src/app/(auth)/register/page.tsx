"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { registerApi } from "@/lib/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerApi(formData);
      login(result.user, result.accessToken);
      router.push("/");
    } catch {
      setError("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { name: "fullName", label: "Họ và tên", type: "text", icon: User, placeholder: "Nguyễn Văn An" },
    { name: "email", label: "Email", type: "email", icon: Mail, placeholder: "email@example.com" },
    { name: "phone", label: "Số điện thoại", type: "tel", icon: Phone, placeholder: "0901234567" },
    { name: "password", label: "Mật khẩu", type: showPassword ? "text" : "password", icon: Lock, placeholder: "Ít nhất 6 ký tự" },
    { name: "confirmPassword", label: "Xác nhận mật khẩu", type: showPassword ? "text" : "password", icon: Lock, placeholder: "Nhập lại mật khẩu" },
  ];

  return (
    <div className="glass-card p-8">
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Đăng ký</h1>
        <p className="text-sm text-muted-foreground">Tạo tài khoản để mua sắm cùng Balii</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-foreground mb-1.5">{field.label}</label>
            <div className="relative">
              <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name as keyof typeof formData]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-sm placeholder:text-muted-foreground/60"
              />
              {(field.name === "password" || field.name === "confirmPassword") && field.name === "password" && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang đăng ký...
            </>
          ) : (
            "Đăng ký"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
