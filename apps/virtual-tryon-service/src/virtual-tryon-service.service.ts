/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateTryOnDto } from './dto/create-tryon.dto';
import { MinioService } from './minio.service';

type UploadedImageFile = {
  mimetype: string;
  buffer: Buffer;
  originalname?: string;
  size?: number;
};

type TryOnFiles = {
  modelImage?: UploadedImageFile[];
  garmentImage?: UploadedImageFile[];
};

@Injectable()
export class VirtualTryonServiceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly minioService: MinioService,
  ) {}

  private fileToBase64(
    file: UploadedImageFile | undefined,
    fieldName: string,
  ): string {
    if (!file) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(`${fieldName} must be an image`);
    }

    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  async createTryOn(files: TryOnFiles, dto: CreateTryOnDto) {
    const apiKey = this.configService.get<string>('FASHN_API_KEY');
    const apiUrl =
      this.configService.get<string>('FASHN_API_URL') ||
      'https://api.fashn.ai/v1/run';

    if (!apiKey) {
      throw new InternalServerErrorException('Missing FASHN_API_KEY');
    }

    const modelFile = files.modelImage?.[0];
    const garmentFile = files.garmentImage?.[0];

    const modelImageBase64 = this.fileToBase64(modelFile, 'modelImage');
    const garmentImageBase64 = this.fileToBase64(garmentFile, 'garmentImage');

    try {
      const response = await axios.post(
        apiUrl,
        {
          model_name: 'tryon-v1.6',

          inputs: {
            model_image: modelImageBase64,
            garment_image: garmentImageBase64,

            category: dto.category || 'auto',
            mode: dto.mode || 'performance',
            garment_photo_type: dto.garmentPhotoType || 'auto',

            moderation_level: 'permissive',
            output_format: 'jpeg',
            return_base64: true,
            num_samples: 1,
            seed: 42,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new BadRequestException({
          success: false,
          message: error.response?.data || error.message,
        });
      }

      throw new BadRequestException({
        success: false,
        message: 'FASHN API error',
      });
    }
  }

  async getTryOnResult(id: string) {
    const apiKey = this.configService.get<string>('FASHN_API_KEY');

    const response = await axios.get(`https://api.fashn.ai/v1/status/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const resultBase64 = response.data.output?.[0];

    if (response.data.status === 'completed' && resultBase64) {
      const { buffer, mimeType } = this.base64ToBuffer(resultBase64);

      const uploaded = await this.minioService.uploadBuffer(
        buffer,
        mimeType,
        `tryon/results/${id}`,
      );

      return {
        success: true,
        data: {
          id,
          status: 'completed',
          resultUrl: uploaded.url,
          resultKey: uploaded.key,
        },
      };
    }

    return {
      success: true,
      data: response.data,
    };
  }

  private base64ToBuffer(base64Image: string) {
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/);

    if (!matches) {
      throw new BadRequestException('Invalid base64 image');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    return { buffer, mimeType };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createTryOnSync(files: TryOnFiles, dto: CreateTryOnDto) {
    const created = await this.createTryOn(files, dto);

    const jobId = created.data.id;

    for (let i = 0; i < 30; i++) {
      await this.sleep(3000);

      const result = await this.getTryOnResult(jobId);

      if (result.data.status === 'completed') {
        return result;
      }

      if (result.data.status === 'failed') {
        throw new BadRequestException({
          success: false,
          message: result.data.error || 'FASHN try-on failed',
        });
      }
    }

    return {
      success: false,
      message: 'Try-on is still processing. Please check status later.',
      data: {
        id: jobId,
        status: 'processing',
      },
    };
  }
}
