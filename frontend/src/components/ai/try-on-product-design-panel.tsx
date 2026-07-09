'use client';

import { type ChangeEvent, type RefObject, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Loader2,
  Palette,
  Shirt,
  Sparkles,
  SwatchBook,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

interface TryOnProductDesignPanelProps {
  baseGarmentImage: string | null;
  colorReferenceImage: string | null;
  patternReferenceImage: string | null;
  isGenerating: boolean;
  canGenerate: boolean;
  onColorReferenceChange: (value: string | null) => void;
  onPatternReferenceChange: (value: string | null) => void;
  onGenerate: () => void;
}

function validateImage(file: File) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn file ảnh JPG, PNG hoặc WebP.');
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Không thể đọc ảnh đã chọn.'));
    };

    reader.onerror = () => {
      reject(new Error('Không thể đọc ảnh đã chọn.'));
    };

    reader.readAsDataURL(file);
  });
}

function ReferenceUploadCard({
  title,
  description,
  icon: Icon,
  image,
  inputRef,
  onChange,
  onClear,
}: {
  title: string;
  description: string;
  icon: typeof Palette;
  image: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  if (image) {
    return (
      <div className="space-y-3 rounded-2xl border border-white/60 bg-white/55 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
          <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 320px" />
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white"
        >
          <Upload className="h-4 w-4 text-violet-500" />
          Đổi ảnh tham chiếu
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-violet-300/60 bg-white/45 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl px-4 py-8 text-center transition-all hover:bg-white/55"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </button>
    </div>
  );
}

export default function TryOnProductDesignPanel({
  baseGarmentImage,
  colorReferenceImage,
  patternReferenceImage,
  isGenerating,
  canGenerate,
  onColorReferenceChange,
  onPatternReferenceChange,
  onGenerate,
}: TryOnProductDesignPanelProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const patternInputRef = useRef<HTMLInputElement>(null);

  const handleSelectImage = useCallback(
    async (
      file: File | undefined,
      onDone: (value: string | null) => void,
      resetInput?: HTMLInputElement | null,
    ) => {
      if (!file) return;

      try {
        validateImage(file);
        const imageDataUrl = await readFileAsDataUrl(file);
        onDone(imageDataUrl);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Không thể dùng ảnh này. Vui lòng thử lại.',
        );

        if (resetInput) {
          resetInput.value = '';
        }
      }
    },
    [],
  );

  return (
    <div className="mt-4 rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-pink-50/70 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-200/70">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Tạo ảnh sản phẩm từ màu và họa tiết tham chiếu
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Dùng ảnh sản phẩm đang chọn làm form gốc, sau đó phối màu từ ảnh màu
            tham chiếu và họa tiết từ ảnh pattern tham chiếu.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/60 bg-white/60 p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <Shirt className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Form gốc</p>
              <p className="text-xs text-muted-foreground">
                Lấy từ sản phẩm đang chọn
              </p>
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
            {baseGarmentImage ? (
              <Image
                src={baseGarmentImage}
                alt="Form gốc sản phẩm"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                Chọn sản phẩm trước để dùng làm form gốc.
              </div>
            )}
          </div>
        </div>

        <ReferenceUploadCard
          title="Ảnh màu tham chiếu"
          description="Chỉ lấy màu và tông màu"
          icon={Palette}
          image={colorReferenceImage}
          inputRef={colorInputRef}
          onChange={(event) =>
            void handleSelectImage(
              event.target.files?.[0],
              onColorReferenceChange,
              event.target,
            )
          }
          onClear={() => {
            onColorReferenceChange(null);
            if (colorInputRef.current) {
              colorInputRef.current.value = '';
            }
          }}
        />

        <ReferenceUploadCard
          title="Ảnh pattern tham chiếu"
          description="Chỉ lấy hoạ tiết hoặc motif"
          icon={SwatchBook}
          image={patternReferenceImage}
          inputRef={patternInputRef}
          onChange={(event) =>
            void handleSelectImage(
              event.target.files?.[0],
              onPatternReferenceChange,
              event.target,
            )
          }
          onClear={() => {
            onPatternReferenceChange(null);
            if (patternInputRef.current) {
              patternInputRef.current.value = '';
            }
          }}
        />
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className={cn(
          'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all',
          canGenerate && !isGenerating
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/40 hover:bg-slate-800'
            : 'cursor-not-allowed border border-white/60 bg-white/65 text-muted-foreground',
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tạo ảnh sản phẩm
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Tạo ảnh sản phẩm phối màu + họa tiết
          </>
        )}
      </button>
    </div>
  );
}
