import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

export interface GoogleLensSearchParams {
  imageFile?: Express.Multer.File;
  imageUrl?: string;
  keyword?: string;
  limit: number;
}

export interface GoogleLensSearchResult {
  title?: string;
  price?: number | null;
  currency?: string | null;
  shopName?: string | null;
  source?: string | null;
  imageUrl?: string | null;
  productUrl?: string | null;
  confidenceScore?: number | null;
  rawData?: Record<string, unknown>;
  [key: string]: unknown;
}

type WorkerResponse = {
  success?: boolean;
  data?: GoogleLensSearchResult[];
};

@Injectable()
export class GoogleLensImageSearchAdapter {
  private readonly logger = new Logger(GoogleLensImageSearchAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async search(
    params: GoogleLensSearchParams,
  ): Promise<GoogleLensSearchResult[]> {
    const workerUrl =
      this.configService.get<string>('MARKET_IMAGE_SEARCH_WORKER_URL') ??
      'http://localhost:8020';
    const timeoutMs = Number(
      this.configService.get<string>('MARKET_IMAGE_SEARCH_TIMEOUT_MS') ??
        '30000',
    );

    try {
      const response = params.imageFile
        ? await this.postMultipart(workerUrl, timeoutMs, params)
        : await this.postJson(workerUrl, timeoutMs, params);

      if (!response.data?.success) {
        return [];
      }

      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT'
        ) {
          this.logger.error('Lens worker offline', error.message);
          throw new ServiceUnavailableException(
            'Image search worker hiện không khả dụng. Vui lòng thử lại sau.',
          );
        }

        if (error.response) {
          const detail =
            typeof error.response.data?.detail === 'string'
              ? error.response.data.detail
              : null;

          this.logger.error(
            `Lens worker error ${error.response.status}`,
            JSON.stringify(error.response.data),
          );

          if (error.response.status === 503 && detail) {
            throw new ServiceUnavailableException(detail);
          }

          throw new BadGatewayException(
            detail ?? 'Dịch vụ tìm kiếm hình ảnh phản hồi không hợp lệ',
          );
        }
      }

      this.logger.error('Lens worker request failed', error);
      throw new BadGatewayException(
        'Không thể kết nối đến dịch vụ tìm kiếm hình ảnh',
      );
    }
  }

  private postJson(
    workerUrl: string,
    timeoutMs: number,
    params: GoogleLensSearchParams,
  ) {
    return axios.post<WorkerResponse>(
      `${workerUrl}/search-by-image/json`,
      {
        imageUrl: params.imageUrl,
        keyword: params.keyword,
        limit: params.limit,
      },
      {
        timeout: timeoutMs,
      },
    );
  }

  private postMultipart(
    workerUrl: string,
    timeoutMs: number,
    params: GoogleLensSearchParams,
  ) {
    const formData = new FormData();

    if (params.imageFile) {
      formData.append('image', params.imageFile.buffer, {
        filename: params.imageFile.originalname,
        contentType: params.imageFile.mimetype,
      });
    }

    if (params.imageUrl) {
      formData.append('imageUrl', params.imageUrl);
    }

    if (params.keyword) {
      formData.append('keyword', params.keyword);
    }

    formData.append('limit', String(params.limit));

    return axios.post<WorkerResponse>(
      `${workerUrl}/search-by-image`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: timeoutMs,
        maxBodyLength: Infinity,
      },
    );
  }
}
