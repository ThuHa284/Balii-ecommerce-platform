"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, User, Phone, MapPin, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Zod Schema ──────────────────────────────────────────────────────────────
const addressSchema = z.object({
  fullName: z
    .string()
    .min(2, "Vui lòng nhập họ và tên (tối thiểu 2 ký tự)"),
  phone: z
    .string()
    .regex(/^(0|\+84)[0-9]{9}$/, "Vui lòng nhập số điện thoại hợp lệ (VD: 0901234567)"),
  province: z.string().min(1, "Vui lòng chọn tỉnh/thành phố"),
  district: z.string().min(1, "Vui lòng chọn quận/huyện"),
  ward: z.string().min(1, "Vui lòng chọn phường/xã"),
  street: z.string().min(5, "Vui lòng nhập địa chỉ cụ thể (tối thiểu 5 ký tự)"),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

// ─── Field component ──────────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} <span className="text-rose-400">*</span>
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm placeholder:text-muted-foreground/60 transition-all";
const inputErrorCls = "border-red-300 focus:ring-red-200";

// ─── Component Props ──────────────────────────────────────────────────────────
interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful save — used to go back to selector */
  onSuccess?: () => void;
}

export default function AddressFormModal({
  open,
  onClose,
  onSuccess,
}: AddressFormModalProps) {
  const { addAddress, addresses } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { isDefault: addresses.length === 0 },
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const onSubmit = async (data: AddressFormData) => {
    setIsSubmitting(true);
    try {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 600));
      addAddress({
        fullName: data.fullName,
        phone: data.phone,
        province: data.province,
        district: data.district,
        ward: data.ward,
        street: data.street,
        isDefault: data.isDefault ?? false,
      });
      toast.success("Thêm địa chỉ thành công!", {
        description: `${data.street}, ${data.ward}, ${data.district}`,
      });
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? "Không thể thêm địa chỉ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/30">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Thêm địa chỉ mới
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-white/40 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Họ và tên" error={errors.fullName?.message}>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register("fullName")}
                  type="text"
                  placeholder="Nguyễn Thị Lan"
                  className={cn(inputCls, "pl-10", errors.fullName && inputErrorCls)}
                />
              </div>
            </Field>
            <Field label="Số điện thoại" error={errors.phone?.message}>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="0901234567"
                  className={cn(inputCls, "pl-10", errors.phone && inputErrorCls)}
                />
              </div>
            </Field>
          </div>

          {/* Province + District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tỉnh/Thành phố" error={errors.province?.message}>
              <input
                {...register("province")}
                type="text"
                placeholder="TP. Hồ Chí Minh"
                className={cn(inputCls, errors.province && inputErrorCls)}
              />
            </Field>
            <Field label="Quận/Huyện" error={errors.district?.message}>
              <input
                {...register("district")}
                type="text"
                placeholder="Quận 1"
                className={cn(inputCls, errors.district && inputErrorCls)}
              />
            </Field>
          </div>

          {/* Ward + Street */}
          <Field label="Phường/Xã" error={errors.ward?.message}>
            <input
              {...register("ward")}
              type="text"
              placeholder="Phường Bến Nghé"
              className={cn(inputCls, errors.ward && inputErrorCls)}
            />
          </Field>
          <Field label="Địa chỉ cụ thể" error={errors.street?.message}>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
              <textarea
                {...register("street")}
                rows={2}
                placeholder="Số nhà, tên đường..."
                className={cn(inputCls, "pl-10 resize-none", errors.street && inputErrorCls)}
              />
            </div>
          </Field>

          {/* Default checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              {...register("isDefault")}
              type="checkbox"
              disabled={addresses.length === 0}
              className="w-4 h-4 rounded text-primary focus:ring-pink-300"
            />
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">
              Đặt làm địa chỉ mặc định
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-white/50 text-foreground font-medium hover:bg-white/40 transition-all text-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu địa chỉ"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
