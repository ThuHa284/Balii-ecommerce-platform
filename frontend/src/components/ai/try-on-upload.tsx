"use client";

import { useRef, useCallback } from "react";
import { Upload, Camera, RotateCcw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTryOnStore } from "@/store/tryon.store";
import { toast } from "sonner";

interface TryOnUploadProps {
  className?: string;
}

export default function TryOnUpload({ className }: TryOnUploadProps) {
  const { userImage, setUserImage, setShowCamera } = useTryOnStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ảnh quá lớn! Vui lòng chọn ảnh dưới 10MB.");
        return;
      }

      // Validate type
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh (JPG, PNG, WebP).");
        return;
      }

      const url = URL.createObjectURL(file);
      setUserImage(url);
    },
    [setUserImage]
  );

  const handleCameraClick = useCallback(() => {
    // On mobile, we can use input capture="user" for a simpler approach
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // On mobile, use a file input with capture attribute
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "user";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setUserImage(url);
        }
      };
      input.click();
    } else {
      // On desktop, show camera modal
      setShowCamera(true);
    }
  }, [setUserImage, setShowCamera]);

  const handleReset = useCallback(() => {
    setUserImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setUserImage]);

  // -- Uploaded state --
  if (userImage) {
    return (
      <div className={cn("relative group", className)}>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-card">
          <img
            src={userImage}
            alt="Ảnh của bạn"
            className="w-full h-full object-cover"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/90 text-foreground text-sm font-medium hover:bg-white hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Đổi ảnh
            </button>
          </div>
        </div>
        {/* Mobile: always-visible change button */}
        <button
          onClick={handleReset}
          className="md:hidden mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 text-sm font-medium text-foreground hover:bg-white/80 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Đổi ảnh khác
        </button>
      </div>
    );
  }

  // -- Upload state --
  return (
    <div className={cn("", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="tryon-user-upload"
      />

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="aspect-[3/4] rounded-2xl glass-card border-2 border-dashed border-violet-300/50 hover:border-violet-400 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-white/50 group"
      >
        <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
          <User className="w-10 h-10 text-violet-400" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium text-foreground mb-1">
            Tải ảnh của bạn
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG hoặc WebP (tối đa 10MB)
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/60 border border-white/50 text-sm font-medium text-foreground hover:bg-white/80 transition-all active:scale-95"
        >
          <Upload className="w-4 h-4 text-violet-500" />
          Thư viện
        </button>
        <button
          onClick={handleCameraClick}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all active:scale-95 shadow-lg shadow-violet-300/25"
        >
          <Camera className="w-4 h-4" />
          Chụp ảnh
        </button>
      </div>
    </div>
  );
}
