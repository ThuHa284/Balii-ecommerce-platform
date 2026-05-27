import { TryOnRequest, TryOnResult } from "@/types/tryon.types";

/**
 * Mock AI Try-On API
 * Simulates a 6-second AI generation process with progress callbacks.
 * Replace this with real API calls when backend is ready.
 */
export async function generateTryOn(
  request: TryOnRequest,
  onProgress?: (progress: number) => void
): Promise<TryOnResult> {
  const totalDuration = 6000; // 6 seconds
  const steps = 60;
  const interval = totalDuration / steps;

  return new Promise((resolve) => {
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = Math.min(Math.round((current / steps) * 100), 100);

      if (onProgress) {
        onProgress(progress);
      }

      if (current >= steps) {
        clearInterval(timer);

        // Return a mock result using the user's own image as "result"
        // In production, this would be the AI-generated image
        resolve({
          id: `tryon_${Date.now()}`,
          resultImageUrl: request.garmentImage,
          status: "completed",
          confidence: 85 + Math.floor(Math.random() * 12),
          createdAt: new Date().toISOString(),
        });
      }
    }, interval);
  });
}
