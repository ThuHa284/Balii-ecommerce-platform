"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export default function ExcelImportModal({
  open,
  onClose,
}: ExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (
        !validTypes.includes(selected.type) &&
        !selected.name.match(/\.(xlsx|xls|csv)$/)
      ) {
        toast.error("Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV");
        return;
      }
      if (selected.size > 20 * 1024 * 1024) {
        toast.error("File quá lớn (tối đa 20MB)");
        return;
      }
      setFile(selected);
      setResult(null);
    },
    []
  );

  const handleImport = async () => {
    if (!file) return;
    setIsUploading(true);

    // Simulate import process
    await new Promise((r) => setTimeout(r, 3000));

    // Mock result
    setResult({
      total: 15,
      success: 13,
      failed: 2,
      errors: [
        { row: 7, message: "Thiếu tên sản phẩm" },
        { row: 12, message: "Giá không hợp lệ (phải là số dương)" },
      ],
    });
    setIsUploading(false);
    toast.success("Import hoàn tất!");
  };

  const handleDownloadTemplate = () => {
    // Create a simple CSV template for download
    const headers = [
      "Tên sản phẩm",
      "Mô tả ngắn",
      "Mô tả chi tiết",
      "Danh mục (slug)",
      "Giá gốc",
      "Giá sale",
      "Size",
      "Màu",
      "Mã SKU",
      "Tồn kho",
      "Tags",
      "Nổi bật (0/1)",
      "Hàng mới (0/1)",
    ];
    const sampleRow = [
      "Bộ Đồ Ngủ Lụa Hồng Pastel",
      "Lụa cao cấp mềm mại",
      "Mô tả chi tiết sản phẩm...",
      "do-ngu-lua",
      "890000",
      "690000",
      "M",
      "Hồng pastel",
      "BDN-HP-M",
      "20",
      "lụa, cao cấp",
      "1",
      "1",
    ];
    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "balii_products_template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải template!");
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg glass-card overflow-hidden animate-fade-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-100">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Import từ Excel
              </h3>
              <p className="text-xs text-muted-foreground">
                Thêm hàng loạt sản phẩm bằng file Excel/CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/40 transition-all active:scale-90"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Template download */}
          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-50/50 border border-violet-200/30 hover:bg-violet-50 transition-colors mb-4 group"
          >
            <Download className="w-4 h-4 text-violet-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                Tải template mẫu
              </p>
              <p className="text-xs text-muted-foreground">
                File CSV với các cột cần thiết và dữ liệu mẫu
              </p>
            </div>
          </button>

          {/* File upload area */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-violet-300/50 hover:border-violet-400 rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-white/40"
            >
              <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Kéo thả file hoặc nhấn để chọn
              </p>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ: .xlsx, .xls, .csv (tối đa 20MB)
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/40 border border-white/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-white/40 border border-white/30 space-y-3">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {result.total}
                  </p>
                  <p className="text-xs text-muted-foreground">Tổng</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {result.success}
                  </p>
                  <p className="text-xs text-muted-foreground">Thành công</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {result.failed}
                  </p>
                  <p className="text-xs text-muted-foreground">Lỗi</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                    Chi tiết lỗi:
                  </p>
                  {result.errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-red-600 bg-red-50/50 p-2 rounded-lg"
                    >
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        Dòng {err.row}: {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/50 text-foreground font-medium text-sm hover:bg-white/40 transition-all active:scale-95"
          >
            {result ? "Đóng" : "Hủy"}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || isUploading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang import...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </button>
          )}
          {result && (
            <button
              onClick={handleReset}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              Import file khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
