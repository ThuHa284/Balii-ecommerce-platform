'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Camera, CameraOff, RotateCcw, Upload, User, X } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';

interface TryOnUploadProps {
  className?: string;
  compact?: boolean;
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

export default function TryOnUpload({
  className,
  compact = false,
}: TryOnUploadProps) {
  const { userImage, setUserImage, showCamera, setShowCamera } =
    useTryOnStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => stopCameraStream, [stopCameraStream]);

  const handleUseImageFile = useCallback(
    async (file: File) => {
      try {
        validateImage(file);
        const imageDataUrl = await readFileAsDataUrl(file);
        setUserImage(imageDataUrl);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Không thể dùng ảnh này. Vui lòng thử lại.',
        );
      }
    },
    [setUserImage],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) return;
      void handleUseImageFile(file);
    },
    [handleUseImageFile],
  );

  const openMobileCameraInput = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        void handleUseImageFile(file);
      }
    };
    input.click();
  }, [handleUseImageFile]);

  const openDesktopCamera = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      toast.error('Trình duyệt hiện tại không hỗ trợ mở camera trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setShowCamera(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {
            toast.error('Không thể phát camera. Vui lòng thử lại.');
          });
        }
      }, 0);
    } catch {
      toast.error(
        'Không thể mở camera. Hãy kiểm tra quyền truy cập camera của trình duyệt.',
      );
      stopCameraStream();
      setShowCamera(false);
    }
  }, [setShowCamera, stopCameraStream]);

  const handleCameraClick = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      openMobileCameraInput();
      return;
    }

    void openDesktopCamera();
  }, [openDesktopCamera, openMobileCameraInput]);

  const handleCloseCameraModal = useCallback(() => {
    stopCameraStream();
    setShowCamera(false);
  }, [setShowCamera, stopCameraStream]);

  const handleCaptureFromCamera = useCallback(() => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error('Camera chưa sẵn sàng để chụp ảnh.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      toast.error('Không thể chụp ảnh từ camera.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.92);

    setUserImage(imageUrl);
    handleCloseCameraModal();
    toast.success('Đã chụp ảnh thành công.');
  }, [handleCloseCameraModal, setUserImage]);

  const handleReset = useCallback(() => {
    setUserImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setUserImage]);

  if (userImage) {
    return (
      <>
        <div className={cn('group relative', className)}>
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl glass-card',
              compact ? 'aspect-[3/4]' : 'aspect-square max-h-[360px]',
            )}
          >
            <Image
              src={userImage}
              alt="Ảnh của bạn"
              fill
              className="object-cover"
              sizes={
                compact
                  ? '(max-width: 468px) 100vw, 280px'
                  : '(max-width: 468px) 100vw, 400px'
              }
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl bg-white/90 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:scale-105 hover:bg-white active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                Đổi ảnh
              </button>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/80 active:scale-95 md:hidden"
          >
            <RotateCcw className="h-4 w-4" />
            Đổi ảnh khác
          </button>
        </div>

        {showCamera && (
          <CameraModal
            videoRef={videoRef}
            onCapture={handleCaptureFromCamera}
            onClose={handleCloseCameraModal}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={cn('', className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="tryon-user-upload"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-300/50 glass-card transition-all hover:border-violet-400 hover:bg-white/50',
            compact ? 'aspect-[3/4] gap-2' : 'aspect-square max-h-[360px] gap-4',
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-violet-100 transition-transform group-hover:scale-110',
              compact ? 'h-14 w-14' : 'h-20 w-20',
            )}
          >
            <User
              className={cn(
                'text-violet-400',
                compact ? 'h-7 w-7' : 'h-10 w-10',
              )}
            />
          </div>
          <div className="px-4 text-center">
            <p
              className={cn(
                'mb-1 font-medium text-foreground',
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              Tải ảnh của bạn
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG hoặc WebP (tối đa 10MB)
            </p>
          </div>
        </div>

        <div
          className={cn('mt-3 grid grid-cols-2', compact ? 'gap-2' : 'gap-3')}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/60 px-4 font-medium text-foreground transition-all hover:bg-white/80 active:scale-95',
              compact ? 'py-2 text-xs' : 'py-3 text-sm',
            )}
          >
            <Upload className="h-4 w-4 text-violet-500" />
            Thư viện
          </button>
          <button
            onClick={handleCameraClick}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 font-medium text-white shadow-lg shadow-violet-300/25 transition-all hover:bg-violet-600 active:scale-95',
              compact ? 'py-2 text-xs' : 'py-3 text-sm',
            )}
          >
            <Camera className="h-4 w-4" />
            Chụp ảnh
          </button>
        </div>
      </div>

      {showCamera && (
        <CameraModal
          videoRef={videoRef}
          onCapture={handleCaptureFromCamera}
          onClose={handleCloseCameraModal}
        />
      )}
    </>
  );
}

function CameraModal({
  videoRef,
  onCapture,
  onClose,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/30 p-5">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Chụp ảnh người mẫu
            </h2>
            <p className="text-sm text-muted-foreground">
              Đứng thẳng, chụp toàn thân để AI xử lý tốt hơn.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/40 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-6 inset-y-8 rounded-[32px] border-2 border-dashed border-white/50" />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/60 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/80"
            >
              <CameraOff className="h-4 w-4" />
              Đóng camera
            </button>
            <button onClick={onCapture} className="btn-primary flex-1 text-sm">
              Chụp ảnh này
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
