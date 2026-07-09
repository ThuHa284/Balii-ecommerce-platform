'use client';

import { useState } from 'react';
import { AlertCircle, Check, MapPin, Plus, X } from 'lucide-react';

import { formatAddressLine } from '@/lib/address-utils';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Address } from '@/types/user.types';
import AddressFormModal from './address-form-modal';

const MAX_ADDRESSES = 5;

interface AddressSelectorModalProps {
  open: boolean;
  onClose: () => void;
}

function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-violet-50/60 shadow-md shadow-violet-200/30'
          : 'border-white/50 bg-white/40 hover:border-violet-200 hover:bg-white/60',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
          )}
        >
          {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {address.fullName}
            </span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{address.phone}</span>
            {address.isDefault && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Mặc định
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {formatAddressLine(address)}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function AddressSelectorModal({
  open,
  onClose,
}: AddressSelectorModalProps) {
  const { addresses, selectedAddressId, setSelectedAddress, hydrateAddresses } =
    useAuthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const atLimit = addresses.length >= MAX_ADDRESSES;
  const draftSelectedId = localSelected ?? selectedAddressId;

  const handleClose = () => {
    setLocalSelected(null);
    onClose();
  };

  const handleConfirm = () => {
    if (draftSelectedId) {
      setSelectedAddress(draftSelectedId);
    }
    handleClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          className="glass-card flex max-h-[80vh] w-full max-w-lg flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/30 p-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Chọn địa chỉ giao hàng
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/40 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                selected={draftSelectedId === addr.id}
                onSelect={() => setLocalSelected(addr.id)}
              />
            ))}

            <div>
              <button
                onClick={() => !atLimit && setShowAddForm(true)}
                disabled={atLimit}
                className={cn(
                  'w-full rounded-xl border-2 border-dashed p-4 text-sm font-medium transition-all',
                  'flex items-center justify-center gap-2',
                  atLimit
                    ? 'cursor-not-allowed border-muted/30 text-muted-foreground/50'
                    : 'border-violet-200 text-primary hover:border-primary hover:bg-violet-50/30',
                )}
              >
                <Plus className="h-4 w-4" />
                Thêm địa chỉ khác
              </button>
              {atLimit && (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Bạn đã đạt giới hạn 5 địa chỉ. Vui lòng xóa bớt trong trang{' '}
                    <strong>Hồ sơ cá nhân</strong> để thêm mới.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-white/30 p-6">
            <button
              onClick={handleClose}
              className="flex-1 rounded-xl border-2 border-white/50 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/40"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={!draftSelectedId}
              className="btn-primary flex-1 text-sm"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>

      <AddressFormModal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => {
          setShowAddForm(false);
          void (async () => {
            await hydrateAddresses();
            const latestAddress =
              useAuthStore.getState().addresses.find((item) => item.isDefault) ??
              useAuthStore.getState().addresses.at(-1);
            if (latestAddress) {
              setLocalSelected(latestAddress.id);
            }
          })();
        }}
      />
    </>
  );
}
