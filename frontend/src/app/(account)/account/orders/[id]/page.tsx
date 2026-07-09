/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { ChangeEvent, useEffect, useEffectEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createOrderReturnRequest,
  getOrderById,
  getOrderReturnRequests,
} from '@/lib/api/orders.api';
import { formatAddressLine } from '@/lib/address-utils';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Order, ReturnRequest } from '@/types/order.types';

const TIMELINE_STEPS = [
  { status: 'pending', label: 'Đặt hàng', icon: ClipboardList },
  { status: 'confirmed', label: 'Xác nhận', icon: ShieldCheck },
  { status: 'processing', label: 'Đang xử lý', icon: Box },
  { status: 'shipping', label: 'Đang giao', icon: Truck },
  { status: 'delivered', label: 'Đã giao', icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  const index = TIMELINE_STEPS.findIndex((step) => step.status === status);
  if (status === 'cancelled' || status === 'refunded') {
    return -1;
  }
  return index;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Không thể đọc ảnh minh chứng.'));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Không thể đọc ảnh minh chứng.'));
    reader.readAsDataURL(file);
  });
}

function ReturnStatusBadge({ status }: { status: ReturnRequest['status'] }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
  } satisfies Record<ReturnRequest['status'], string>;

  const labels = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
  } satisfies Record<ReturnRequest['status'], string>;

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnReason, setReturnReason] = useState('');
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const loadOrder = useEffectEvent(async () => {
    setLoading(true);
    try {
      const [orderData, returnData] = await Promise.all([
        getOrderById(params.id),
        getOrderReturnRequests(params.id).catch(() => []),
      ]);
      setOrder(orderData);
      setReturnRequests(returnData);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadOrder();
  }, [params.id]);

  async function handleReturnImageChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5);
    try {
      const dataUrls = await Promise.all(
        files.map((file) => fileToDataUrl(file)),
      );
      setReturnImages(dataUrls);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể tải ảnh minh chứng.',
      );
    }
  }

  async function handleSubmitReturnRequest() {
    if (!order) return;

    if (!returnReason.trim()) {
      toast.error('Vui lòng nhập lý do trả hàng.');
      return;
    }

    if (returnImages.length === 0) {
      toast.error('Vui lòng tải lên ít nhất 1 ảnh minh chứng.');
      return;
    }

    try {
      setIsSubmittingReturn(true);
      const created = await createOrderReturnRequest(order.id, {
        reason: returnReason.trim(),
        imageUrls: returnImages,
      });
      setReturnRequests((current) => [created, ...current]);
      setReturnReason('');
      setReturnImages([]);
      toast.success('Đã gửi yêu cầu trả hàng để admin xác nhận.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể gửi yêu cầu trả hàng.',
      );
    } finally {
      setIsSubmittingReturn(false);
    }
  }

  const activeReturnRequest = useMemo(
    () =>
      returnRequests.find((request) =>
        ['pending', 'approved'].includes(request.status),
      ) ?? null,
    [returnRequests],
  );

  if (loading) {
    return (
      <div>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-white/50" />
        <div className="glass-card animate-pulse space-y-6 p-8">
          <div className="h-6 w-1/3 rounded bg-white/50" />
          <div className="space-y-4">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex gap-4">
                <div className="h-20 w-16 rounded-xl bg-white/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-white/50" />
                  <div className="h-3 w-1/3 rounded bg-white/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="glass-card p-12 text-center">
        <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="mb-4 text-muted-foreground">Không tìm thấy đơn hàng</p>
        <Link
          href="/account/orders"
          className="btn-primary inline-block text-sm"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const orderStatus = String(order.status);
  const paymentMethod = String(order.paymentMethod);
  const paymentStatus = String(order.paymentStatus);
  const currentStep = getStepIndex(orderStatus);
  const isCancelled = orderStatus === 'cancelled' || orderStatus === 'refunded';
  const paymentStatusClass =
    PAYMENT_STATUS_COLORS[paymentStatus] || PAYMENT_STATUS_COLORS.pending;
  const paymentStatusLabel =
    PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus;
  const isVnpayPending =
    paymentMethod === 'vnpay' && paymentStatus === 'pending';
  const isVnpayFailed = paymentMethod === 'vnpay' && paymentStatus === 'failed';
  const canRequestReturn = orderStatus === 'delivered' && !activeReturnRequest;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/account/orders"
          className="rounded-xl p-2 transition-colors hover:bg-white/50"
        >
          <ArrowLeft className="h-5 w-5 text-foreground/70" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Đơn hàng {order.orderCode}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Đặt ngày {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            ORDER_STATUS_COLORS[orderStatus]
          }`}
        >
          {ORDER_STATUS_LABELS[orderStatus]}
        </span>
      </div>

      {!isCancelled ? (
        <div className="glass-card mb-6 p-6">
          <h2 className="mb-5 font-heading text-sm font-semibold text-foreground">
            Trạng thái đơn hàng
          </h2>
          <div className="relative flex items-center justify-between">
            <div className="absolute left-5 right-5 top-5 z-0 h-0.5 bg-white/50" />
            <div
              className="absolute left-5 top-5 z-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
              style={{
                width:
                  currentStep >= 0
                    ? `calc(${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}% - 40px)`
                    : '0%',
              }}
            />

            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={step.status}
                  className="relative z-10 flex flex-col items-center gap-2"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-300/30'
                        : 'border-2 border-white/60 bg-white/70 text-muted-foreground/50'
                    } ${isCurrent ? 'scale-110 ring-4 ring-violet-200' : ''}`}
                  >
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`whitespace-nowrap text-center text-[11px] font-medium ${
                      isCompleted ? 'text-primary' : 'text-muted-foreground/50'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isCancelled ? (
        <div
          className={`glass-card mb-6 border-l-4 p-5 ${
            orderStatus === 'cancelled'
              ? 'border-l-red-400'
              : 'border-l-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {orderStatus === 'cancelled' ? (
              <XCircle className="h-6 w-6 text-red-500" />
            ) : (
              <RotateCcw className="h-6 w-6 text-gray-500" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {orderStatus === 'cancelled'
                  ? 'Đơn hàng đã bị hủy'
                  : 'Đơn hàng đã được hoàn tiền'}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Cập nhật lần cuối: {formatDateTime(order.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isVnpayPending || isVnpayFailed ? (
        <div
          className={`glass-card mb-6 border-l-4 p-5 ${
            isVnpayFailed ? 'border-l-rose-400' : 'border-l-amber-400'
          }`}
        >
          <div className="flex items-start gap-3">
            {isVnpayFailed ? (
              <XCircle className="mt-0.5 h-5 w-5 text-rose-500" />
            ) : (
              <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {isVnpayFailed
                  ? 'Giao dịch VNPay chưa hoàn tất'
                  : 'Đang chờ VNPay xác nhận'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isVnpayFailed
                  ? 'Đơn hàng vẫn được giữ trong hệ thống. Bạn có thể thanh toán lại hoặc liên hệ hỗ trợ.'
                  : 'Nếu bạn đã thanh toán trên VNPay nhưng đơn hàng chưa cập nhật, vui lòng chờ thêm một chút và tải lại trang.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <Package className="h-4 w-4 text-primary" />
              Sản phẩm ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-white/40"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-white/50">
                    <Image
                      src={item.thumbnail}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="line-clamp-1 text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Màu: {item.variantColor} | Size: {item.variantSize}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(item.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      x {item.quantity}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(orderStatus === 'delivered' || returnRequests.length > 0) && (
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-sm font-semibold text-foreground">
                    Yêu cầu trả hàng
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Người dùng cần nêu lý do và gửi ảnh minh chứng để admin xác
                    nhận.
                  </p>
                </div>
                {activeReturnRequest ? (
                  <ReturnStatusBadge status={activeReturnRequest.status} />
                ) : null}
              </div>

              {returnRequests.length > 0 && (
                <div className="mb-6 space-y-4">
                  {returnRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-white/50 bg-white/50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Gửi lúc {formatDateTime(request.createdAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.reason}
                          </p>
                        </div>
                        <ReturnStatusBadge status={request.status} />
                      </div>

                      {request.imageUrls.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                          {request.imageUrls.map((imageUrl, index) => (
                            <div
                              key={`${request.id}-${index}`}
                              className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                            >
                              <Image
                                src={imageUrl}
                                alt={`Ảnh minh chứng ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {request.adminNote ? (
                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                          Phản hồi admin: {request.adminNote}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {canRequestReturn ? (
                <div className="space-y-4">
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={4}
                    placeholder="Mô tả rõ lý do trả hàng và vấn đề gặp phải..."
                    className="w-full rounded-2xl border border-white/50 bg-white/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-violet-300 bg-violet-50/50 px-4 py-4 text-sm text-violet-700">
                    <Upload className="h-4 w-4" />
                    <span>
                      Tải ảnh minh chứng
                      {returnImages.length > 0
                        ? ` (${returnImages.length} ảnh đã chọn)`
                        : ' (tối đa 5 ảnh)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => void handleReturnImageChange(e)}
                    />
                  </label>

                  {returnImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {returnImages.map((imageUrl, index) => (
                        <div
                          key={index}
                          className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                        >
                          <Image
                            src={imageUrl}
                            alt={`Ảnh minh chứng ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleSubmitReturnRequest()}
                    disabled={isSubmittingReturn}
                    className="btn-primary w-full py-3 text-sm disabled:opacity-60"
                  >
                    {isSubmittingReturn
                      ? 'Đang gửi yêu cầu...'
                      : 'Gửi yêu cầu trả hàng'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              Địa chỉ giao hàng
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {order.shippingAddress.fullName}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.phone}
              </p>
              <p className="text-muted-foreground">
                {formatAddressLine(order.shippingAddress)}
              </p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              Thanh toán
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phương thức</span>
                <span className="font-medium text-foreground">
                  {PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusClass}`}
                >
                  {paymentStatusLabel}
                </span>
              </div>
              {paymentMethod === 'vnpay' ? (
                <div className="rounded-xl bg-white/40 px-3 py-2 text-xs text-muted-foreground">
                  {paymentStatus === 'paid'
                    ? 'Giao dịch VNPay đã được xác nhận.'
                    : paymentStatus === 'failed'
                      ? 'VNPay đã trả về kết quả thất bại cho đơn hàng này.'
                      : 'Đơn hàng đang chờ callback hoặc IPN từ VNPay để đối soát thanh toán.'}
                </div>
              ) : null}
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
              Tổng kết
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="text-foreground">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giảm giá</span>
                  <span className="text-emerald-600">
                    -{formatCurrency(order.discount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="text-foreground">
                  {order.shippingFee === 0
                    ? 'Miễn phí'
                    : formatCurrency(order.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/30 pt-3">
                <span className="font-semibold text-foreground">Tổng cộng</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          {order.note ? (
            <div className="glass-card p-6">
              <h2 className="mb-3 font-heading text-sm font-semibold text-foreground">
                Ghi chú
              </h2>
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{order.note}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
