'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MapPin, Phone, User, X } from 'lucide-react';
import { toast } from 'sonner';

import { getProvinces } from '@/lib/api/locations.api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { LocationOption } from '@/types/location.types';

const addressSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự)'),
  phone: z
    .string()
    .regex(
      /^(0|\+84)[0-9]{9}$/,
      'Vui lòng nhập số điện thoại hợp lệ (ví dụ: 0901234567)',
    ),
  provinceId: z.string().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  ward: z.string().min(2, 'Vui lòng nhập phường/xã'),
  street: z.string().min(5, 'Vui lòng nhập địa chỉ cụ thể'),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

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
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label} <span className="text-rose-400">*</span>
      </label>
      {children}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/50 bg-white/60 px-4 py-3 text-sm transition-all placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300';
const inputErrorCls = 'border-red-300 focus:ring-red-200';

interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddressFormModal({
  open,
  onClose,
  onSuccess,
}: AddressFormModalProps) {
  const { addAddress, addresses } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);

  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      provinceId: '',
      ward: '',
      street: '',
      isDefault: addresses.length === 0,
    },
  });

  const provinceId = watch('provinceId');

  const selectedProvince = useMemo(
    () => provinces.find((item) => String(item.id) === provinceId) ?? null,
    [provinceId, provinces],
  );

  const handleClose = useCallback(() => {
    reset({
      fullName: '',
      phone: '',
      provinceId: '',
      ward: '',
      street: '',
      isDefault: addresses.length === 0,
    });
    onClose();
  }, [addresses.length, onClose, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    async function loadProvinces() {
      try {
        setIsLoadingLocations(true);
        const provinceList = await getProvinces();
        if (isMounted) {
          setProvinces(provinceList);
        }
      } catch {
        toast.error('Không thể tải danh sách tỉnh/thành phố.');
      } finally {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      }
    }

    void loadProvinces();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const onSubmit = async (data: AddressFormData) => {
    if (!selectedProvince) {
      toast.error('Vui lòng chọn tỉnh/thành phố hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAddress({
        fullName: data.fullName,
        phone: data.phone,
        provinceId: selectedProvince.id,
        districtId: 0,
        wardId: 0,
        province: selectedProvince.name,
        district: '',
        ward: data.ward.trim(),
        street: data.street.trim(),
        isDefault: data.isDefault ?? false,
      });

      toast.success('Thêm địa chỉ thành công.', {
        description: `${data.street.trim()}, ${data.ward.trim()}, ${selectedProvince.name}`,
      });

      handleClose();
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Không thể thêm địa chỉ. Vui lòng thử lại.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/30 p-6">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Thêm địa chỉ mới
          </h2>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/40 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-4 p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" error={errors.fullName?.message}>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  {...register('fullName')}
                  type="text"
                  placeholder="Nguyễn Thị Lan"
                  className={cn(
                    inputCls,
                    'pl-10',
                    errors.fullName && inputErrorCls,
                  )}
                />
              </div>
            </Field>

            <Field label="Số điện thoại" error={errors.phone?.message}>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="0901234567"
                  className={cn(
                    inputCls,
                    'pl-10',
                    errors.phone && inputErrorCls,
                  )}
                />
              </div>
            </Field>
          </div>

          <Field label="Tỉnh/Thành phố" error={errors.provinceId?.message}>
            <select
              {...register('provinceId')}
              className={cn(inputCls, errors.provinceId && inputErrorCls)}
              disabled={isLoadingLocations}
            >
              <option value="">
                {isLoadingLocations
                  ? 'Đang tải tỉnh/thành phố...'
                  : 'Chọn tỉnh/thành phố'}
              </option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Phường/Xã" error={errors.ward?.message}>
            <input
              {...register('ward')}
              type="text"
              placeholder="Ví dụ: Phường Tân Định"
              className={cn(inputCls, errors.ward && inputErrorCls)}
            />
          </Field>

          <Field label="Địa chỉ cụ thể" error={errors.street?.message}>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
              <textarea
                {...register('street')}
                rows={2}
                placeholder="Số nhà, tên đường..."
                className={cn(
                  inputCls,
                  'resize-none pl-10',
                  errors.street && inputErrorCls,
                )}
              />
            </div>
          </Field>

          <label className="group flex cursor-pointer items-center gap-3">
            <input
              {...register('isDefault')}
              type="checkbox"
              disabled={addresses.length === 0}
              className="h-4 w-4 rounded text-primary focus:ring-violet-300"
            />
            <span className="text-sm text-foreground/70 transition-colors group-hover:text-foreground">
              Đặt làm địa chỉ mặc định
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border-2 border-white/50 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/40"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu địa chỉ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
