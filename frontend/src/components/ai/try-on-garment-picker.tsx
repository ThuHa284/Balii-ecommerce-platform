"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Search, Upload, Check, ShoppingBag, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTryOnStore } from "@/store/tryon.store";
import { getProducts } from "@/lib/api/products.api";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/product.types";
import { toast } from "sonner";

interface TryOnGarmentPickerProps {
  className?: string;
}

type GarmentTab = "shop" | "upload";

export default function TryOnGarmentPicker({
  className,
}: TryOnGarmentPickerProps) {
  const { garmentImage, selectedProduct, setGarmentImage } = useTryOnStore();
  const [activeTab, setActiveTab] = useState<GarmentTab>(
    selectedProduct ? "shop" : "shop"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await getProducts({ limit: 100 });
        setProducts(response.products);
      } catch {
        toast.error("Khong tai duoc danh sach san pham. Vui long thu lai.");
      }
    }

    void loadProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = useCallback(
    (product: Product) => {
      setGarmentImage(product.thumbnail, product);
    },
    [setGarmentImage]
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 10MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh.");
        return;
      }
      const url = URL.createObjectURL(file);
      setGarmentImage(url, null);
    },
    [setGarmentImage]
  );

  const handleClearGarment = useCallback(() => {
    setGarmentImage(null, null);
  }, [setGarmentImage]);

  // -- If garment is selected, show preview --
  if (garmentImage) {
    return (
      <div className={cn("", className)}>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-card group">
          <img
            src={garmentImage}
            alt={selectedProduct?.name || "Quần áo đã chọn"}
            className="w-full h-full object-cover"
          />
          {selectedProduct && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-sm font-medium truncate">
                {selectedProduct.name}
              </p>
              <p className="text-white/80 text-xs">
                {formatCurrency(
                  selectedProduct.salePrice || selectedProduct.basePrice
                )}
              </p>
            </div>
          )}
          {/* Selected badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-medium shadow-lg">
            <Check className="w-3 h-3" />
            Đã chọn
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              onClick={handleClearGarment}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/90 text-foreground text-sm font-medium hover:bg-white hover:scale-105 active:scale-95 transition-all"
            >
              Đổi sản phẩm
            </button>
          </div>
        </div>
        {/* Mobile change button */}
        <button
          onClick={handleClearGarment}
          className="md:hidden mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm font-medium text-foreground hover:bg-white/80 transition-all active:scale-95"
        >
          Đổi sản phẩm khác
        </button>
      </div>
    );
  }

  // -- Picker UI --
  return (
    <div className={cn("", className)}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/40 mb-4">
        <button
          onClick={() => setActiveTab("shop")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "shop"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingBag className="w-4 h-4" />
          Từ cửa hàng
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "upload"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ImageIcon className="w-4 h-4" />
          Tải ảnh riêng
        </button>
      </div>

      {activeTab === "shop" ? (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="group glass-card-hover overflow-hidden text-left rounded-xl"
              >
                <div className="relative aspect-square overflow-hidden rounded-t-xl">
                  <Image
                    src={product.thumbnail}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 40vw, 200px"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-foreground truncate mb-0.5">
                    {product.name}
                  </p>
                  <p className="text-xs text-primary font-semibold">
                    {formatCurrency(product.salePrice || product.basePrice)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                Không tìm thấy sản phẩm
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[3/4] rounded-2xl glass-card border-2 border-dashed border-violet-300/50 hover:border-violet-400 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-white/50"
          >
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
              <Upload className="w-10 h-10 text-violet-400" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground mb-1">
                Tải ảnh quần áo
              </p>
              <p className="text-xs text-muted-foreground">
                Ảnh flatlay hoặc trên mannequin cho kết quả tốt nhất
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
