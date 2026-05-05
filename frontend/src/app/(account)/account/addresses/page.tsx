"use client";

import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";

const mockAddresses = [
  { id: "addr_001", fullName: "Nguyễn Văn An", phone: "0901234567", street: "123 Nguyễn Huệ", ward: "Phường Bến Nghé", district: "Quận 1", province: "TP. Hồ Chí Minh", isDefault: true },
  { id: "addr_002", fullName: "Nguyễn Văn An", phone: "0901234567", street: "456 Lê Lợi", ward: "Phường 1", district: "Quận 3", province: "TP. Hồ Chí Minh", isDefault: false },
];

export default function AddressesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Sổ địa chỉ</h1>
        <button className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Thêm địa chỉ
        </button>
      </div>
      <div className="space-y-4">
        {mockAddresses.map((addr) => (
          <div key={addr.id} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{addr.fullName}</p>
                    {addr.isDefault && <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">Mặc định</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{addr.phone}</p>
                  <p className="text-sm text-muted-foreground">{addr.street}, {addr.ward}, {addr.district}, {addr.province}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Pencil className="w-4 h-4" /></button>
                <button className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
