import axios from "axios";
import { SOCKET_URL } from "@/lib/constants";
import { TryOnRequest, TryOnResult } from "@/types/tryon.types";

type TryOnSyncResponse = {
  id?: string;
  status?: string;
  resultUrl?: string;
  resultKey?: string;
  message?: string;
  error?: string;
};

const TRYON_API_BASE_URL = `${SOCKET_URL.replace(/\/$/, "")}/try-on`;

function startProgressSimulation(onProgress?: (progress: number) => void) {
  let progress = 0;

  const timer = window.setInterval(() => {
    progress = Math.min(progress + (progress < 70 ? 6 : 2), 90);
    onProgress?.(progress);
  }, 800);

  return {
    complete() {
      onProgress?.(100);
      window.clearInterval(timer);
    },
    stop() {
      window.clearInterval(timer);
    },
  };
}

async function imageUrlToFile(imageUrl: string, baseName: string): Promise<File> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Khong the tai anh ${baseName} de gui den dich vu try-on.`);
  }

  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "jpg";

  return new File([blob], `${baseName}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
}

function extractTryOnPayload(payload: unknown): TryOnSyncResponse {
  const response = payload as {
    data?: TryOnSyncResponse;
  } & TryOnSyncResponse;

  return response?.data ?? response;
}

function normalizeTryOnError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string | Record<string, unknown> }
      | undefined;

    const message =
      typeof responseData?.message === "string"
        ? responseData.message
        : error.message || "Khong the ket noi den dich vu try-on.";

    return new Error(message);
  }

  return error instanceof Error
    ? error
    : new Error("Co loi xay ra khi tao anh try-on.");
}

export async function generateTryOn(
  request: TryOnRequest,
  onProgress?: (progress: number) => void
): Promise<TryOnResult> {
  const progress = startProgressSimulation(onProgress);

  try {
    const [modelImageFile, garmentImageFile] = await Promise.all([
      imageUrlToFile(request.userImage, "model-image"),
      imageUrlToFile(request.garmentImage, "garment-image"),
    ]);

    const formData = new FormData();
    formData.append("modelImage", modelImageFile);
    formData.append("garmentImage", garmentImageFile);
    formData.append("category", request.category || "auto");
    formData.append("mode", request.mode || "performance");
    formData.append("garmentPhotoType", request.garmentPhotoType || "auto");

    const response = await axios.post(
      `${TRYON_API_BASE_URL}/sync`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 180000,
      }
    );

    const payload = extractTryOnPayload(response.data);

    if (payload.status !== "completed" || !payload.resultUrl) {
      throw new Error(payload.message || payload.error || "Try-on chua hoan tat.");
    }

    progress.complete();

    return {
      id: payload.id || `tryon_${Date.now()}`,
      resultImageUrl: payload.resultUrl,
      status: "completed",
      confidence: 0,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    progress.stop();
    throw normalizeTryOnError(error);
  }
}
