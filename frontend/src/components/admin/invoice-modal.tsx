'use client';

import { Printer, X } from 'lucide-react';
import { formatAddressLine } from '@/lib/address-utils';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types/order.types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  order,
}: InvoiceModalProps) {
  if (!isOpen || !order) return null;

  const shippingAddr = order.shippingAddress;
  const addressString = formatAddressLine(shippingAddr);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />

      <div className="animate-slide-in fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-slate-100 shadow-2xl print:absolute print:inset-0 print:w-full print:bg-white print:shadow-none">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4 print:hidden">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            Hóa đơn đóng gói #{order.orderCode}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md shadow-violet-500/10"
            >
              <Printer className="h-3.5 w-3.5" /> In hóa đơn
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 justify-center overflow-y-auto bg-slate-50 p-6 print:bg-white print:p-0">
          <div
            id="printable-invoice"
            className="flex min-h-[148mm] w-[105mm] flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 font-mono text-[10px] text-black shadow-lg print:w-full print:rounded-none print:border-none print:p-0 print:shadow-none"
          >
            <style>{`
              @media print {
                body {
                  background: white;
                  color: black;
                }
                body > *:not(#printable-invoice-wrapper) {
                  display: none !important;
                }
                #printable-invoice {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  width: 100% !important;
                  min-height: auto !important;
                }
              }
            `}</style>

            <div className="space-y-4">
              <div className="space-y-1 border-b border-dashed border-black pb-2 text-center">
                <h1 className="text-sm font-extrabold tracking-wider">
                  BALII SLEEPWEAR
                </h1>
                <p className="text-[8px]">Kênh mua sắm đồ ngủ cao cấp online</p>
                <p className="text-[8px]">Shopee: shopee.vn/balii.sleepwear</p>
                <p className="text-[8px]">Hotline: 0987 654 321</p>
              </div>

              <div className="flex items-center justify-between border-b border-dashed border-black pb-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-extrabold">
                    ĐƠN HÀNG: {order.orderCode}
                  </p>
                  <p className="text-[8px] text-slate-500">
                    Ngày đặt:{' '}
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-[8px]">Đơn vị VC: GHN (Giao Hàng Nhanh)</p>
                </div>
                <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-black p-1">
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 100 100"
                    fill="black"
                  >
                    <rect width="25" height="25" />
                    <rect x="75" width="25" height="25" />
                    <rect y="75" width="25" height="25" />
                    <rect x="35" y="35" width="30" height="30" />
                    <rect x="10" y="45" width="10" height="10" />
                    <rect x="45" y="10" width="10" height="10" />
                    <rect x="80" y="50" width="15" height="15" />
                    <rect x="55" y="80" width="15" height="15" />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5 border-b border-black pb-3">
                <div>
                  <span className="font-extrabold">NGƯỜI NHẬN: </span>
                  <span className="text-[11px] font-bold">
                    {shippingAddr.fullName}
                  </span>
                </div>
                <div>
                  <span className="font-extrabold">SĐT: </span>
                  <span className="text-[11px] font-bold">
                    {shippingAddr.phone}
                  </span>
                </div>
                <div>
                  <span className="font-extrabold">ĐỊA CHỈ: </span>
                  <span className="leading-tight">{addressString}</span>
                </div>
              </div>

              <div className="border-b border-black pb-3">
                <table className="w-full text-left text-[9px]">
                  <thead>
                    <tr className="border-b border-black font-extrabold">
                      <th className="w-7/12 pb-1">Sản phẩm</th>
                      <th className="w-2/12 pb-1 text-center">SL</th>
                      <th className="w-3/12 pb-1 text-right">Tổng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-black/60">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1">
                          <p className="font-bold leading-tight">
                            {item.productName}
                          </p>
                          <p className="text-[7.5px] text-slate-700">
                            Phân loại: {item.variantColor} / Size{' '}
                            {item.variantSize}
                          </p>
                          <p className="font-mono text-[7px] text-slate-500">
                            SKU: {item.sku}
                          </p>
                        </td>
                        <td className="py-1 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-1 text-right font-bold">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 border-b border-black pb-3 text-right text-[9px]">
                <div className="flex justify-between">
                  <span>Tiền hàng:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Khấu trừ giảm giá:</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>{formatCurrency(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-black/55 pt-1.5 text-[11px] font-extrabold">
                  <span>TỔNG THU COD:</span>
                  <span className="text-sm">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-2 pt-3 text-center">
              {order.note && (
                <div className="border border-dashed border-black p-1.5 text-left font-sans text-[7.5px] leading-relaxed">
                  <p className="font-bold">Ghi chú đơn hàng:</p>
                  <p>{order.note}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[8px] font-extrabold uppercase">
                  Cho phép đồng kiểm (kiểm hàng trước khi nhận)
                </p>
                <p className="text-[7.5px] italic text-slate-500">
                  Cảm ơn quý khách đã tin chọn Balii Sleepwear! Chúc quý khách
                  giấc ngủ an lành!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
