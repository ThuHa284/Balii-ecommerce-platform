"use client";

import { useState } from "react";
import { X, MapPin, Plus, Check, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";
import { Address } from "@/types/user.types";
import AddressFormModal from "./address-form-modal";

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
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group",
        selected
          ? "border-primary bg-violet-50/60 shadow-md shadow-violet-200/30"
          : "border-white/50 bg-white/40 hover:border-violet-200 hover:bg-white/60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Radio indicator */}
        <div
          className={cn(
            "mt-0.5 w-4.5 h-4.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          )}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{address.fullName}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">{address.phone}</span>
            {address.isDefault && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Mặc định
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {address.street}, {address.ward}, {address.district}, {address.province}
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
  const { addresses, selectedAddressId, setSelectedAddress } = useAuthStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [localSelected, setLocalSelected] = useState(selectedAddressId);
  const atLimit = addresses.length >= MAX_ADDRESSES;

  if (!open) return null;

  const handleConfirm = () => {
    if (localSelected) setSelectedAddress(localSelected);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/30 shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Chọn địa chỉ giao hàng
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/40 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Address list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                selected={localSelected === addr.id}
                onSelect={() => setLocalSelected(addr.id)}
              />
            ))}

            {/* Add new address button */}
            <div>
              <button
                onClick={() => !atLimit && setShowAddForm(true)}
                disabled={atLimit}
                className={cn(
                  "w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed text-sm font-medium transition-all",
                  atLimit
                    ? "border-muted/30 text-muted-foreground/50 cursor-not-allowed"
                    : "border-violet-200 text-primary hover:border-primary hover:bg-violet-50/30"
                )}
              >
                <Plus className="w-4 h-4" />
                Thêm địa chỉ mới
              </button>
              {atLimit && (
                <div className="flex items-start gap-2 mt-2 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Bạn đã đạt giới hạn 5 địa chỉ. Vui lòng xóa bớt trong trang{" "}
                    <strong>Hồ sơ cá nhân</strong> để thêm mới.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/30 shrink-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-white/50 text-foreground font-medium hover:bg-white/40 transition-all text-sm"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={!localSelected}
              className="flex-1 btn-primary text-sm"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>

      {/* Nested add-address form */}
      <AddressFormModal
        open={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSuccess={() => setShowAddForm(false)}
      />
    </>
  );
}
