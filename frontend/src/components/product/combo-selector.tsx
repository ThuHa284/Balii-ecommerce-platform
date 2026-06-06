"use client";

import { useState } from "react";
import Image from "next/image";
import { Gift, Flame, Gem, Check, ChevronDown, ChevronUp } from "lucide-react";
import { COMBO_TIERS, MOCK_COMBO_SHORTS } from "@/lib/api/mock-data";
import { formatCurrency } from "@/lib/utils";

interface ComboSelectorProps {
  productPrice: number;
  onSelectCombo?: (tier: typeof COMBO_TIERS[number], shortsSize: string, shortsColor: string) => void;
}

export default function ComboSelector({ productPrice, onSelectCombo }: ComboSelectorProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(MOCK_COMBO_SHORTS.sizes[1]); // Default M
  const [selectedColor, setSelectedColor] = useState(MOCK_COMBO_SHORTS.colors[0]);
  const [isExpanded, setIsExpanded] = useState(false);

  const tierIcons: Record<string, React.ReactNode> = {
    gift: <Gift className="w-4 h-4" />,
    flame: <Flame className="w-4 h-4" />,
    gem: <Gem className="w-4 h-4" />,
  };

  const handleSelectTier = (tierId: string) => {
    setSelectedTier(tierId === selectedTier ? null : tierId);
    if (tierId !== selectedTier) {
      setIsExpanded(true);
    }
  };

  const handleConfirmCombo = () => {
    if (!selectedTier) return;
    const tier = COMBO_TIERS.find((t) => t.id === selectedTier);
    if (tier && onSelectCombo) {
      onSelectCombo(tier, selectedSize, selectedColor.name);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Gift className="w-5 h-5 text-violet-500" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">
              🎁 Thêm Quần Bảo Hộ Với Giá Ưu Đãi
            </h3>
            <p className="text-xs text-muted-foreground">
              Chỉ từ {formatCurrency(MOCK_COMBO_SHORTS.comboPrice)} — Mua nhiều tặng FREE!
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable Content */}
      <div
        className={`overflow-hidden transition-all duration-500 ${
          isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 space-y-4">
          {/* Product Preview */}
          <div className="flex items-center gap-3 p-3 bg-white/40 rounded-xl">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={MOCK_COMBO_SHORTS.image}
                alt={MOCK_COMBO_SHORTS.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {MOCK_COMBO_SHORTS.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {MOCK_COMBO_SHORTS.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(MOCK_COMBO_SHORTS.comboPrice)}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatCurrency(MOCK_COMBO_SHORTS.basePrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Tier Selection */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Chọn combo
            </p>
            {COMBO_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              const isHot = tier.id === "combo_2";
              const isVIP = tier.id === "combo_3";

              return (
                <button
                  key={tier.id}
                  onClick={() => handleSelectTier(tier.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                    isSelected
                      ? isVIP
                        ? "bg-violet-50 border-2 border-violet-400 shadow-md"
                        : isHot
                        ? "bg-orange-50 border-2 border-orange-400 shadow-md"
                        : "bg-violet-50 border-2 border-violet-300 shadow-md"
                      : "bg-white/40 border-2 border-transparent hover:bg-white/60"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      isSelected
                        ? isVIP
                          ? "bg-violet-500 text-white"
                          : isHot
                          ? "bg-orange-500 text-white"
                          : "bg-violet-400 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tierIcons[tier.icon]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {tier.badge} {tier.name}
                      </span>
                      {isHot && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded">
                          HOT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    {tier.freeShorts > 0 ? (
                      <span className="text-sm font-bold text-green-600">FREE</span>
                    ) : (
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(tier.shortsPrice)}
                      </span>
                    )}
                  </div>

                  {/* Check */}
                  {isSelected && (
                    <Check className="w-5 h-5 text-violet-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Size & Color Selection (shown when tier selected) */}
          {selectedTier && (
            <div className="space-y-3 p-3 bg-white/30 rounded-xl">
              {/* Size */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Chọn size quần
                </p>
                <div className="flex gap-2">
                  {MOCK_COMBO_SHORTS.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                        selectedSize === size
                          ? "bg-violet-500 text-white shadow-md"
                          : "bg-white/60 text-foreground hover:bg-white"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Chọn màu quần
                </p>
                <div className="flex gap-2">
                  {MOCK_COMBO_SHORTS.colors.map((color) => (
                    <button
                      key={color.code}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor.code === color.code
                          ? "border-violet-500 scale-110 shadow-md"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color.code }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedColor.name}
                </p>
              </div>

              {/* Price Summary */}
              <div className="pt-3 border-t border-white/40">
                {(() => {
                  const tier = COMBO_TIERS.find((t) => t.id === selectedTier);
                  if (!tier) return null;
                  const shortsTotal =
                    tier.freeShorts > 0
                      ? 0
                      : tier.shortsPrice;
                  const savedAmount =
                    tier.freeShorts > 0
                      ? tier.freeShorts * MOCK_COMBO_SHORTS.basePrice
                      : MOCK_COMBO_SHORTS.basePrice - tier.shortsPrice;

                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quần bảo hộ:</span>
                        <span className="font-medium">
                          {shortsTotal === 0 ? (
                            <span className="text-green-600 font-bold">MIỄN PHÍ</span>
                          ) : (
                            formatCurrency(shortsTotal)
                          )}
                        </span>
                      </div>
                      {savedAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-green-600">Tiết kiệm:</span>
                          <span className="text-green-600 font-bold">
                            -{formatCurrency(savedAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmCombo}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Gift className="w-4 h-4" />
                Thêm combo vào giỏ hàng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
