/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonAnalysisService } from './analysis/person-analysis.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateTryOnDto } from './dto/create-tryon.dto';
import { TryonHistory } from './entities/tryon-history.entity';

type UploadedImageFile = Express.Multer.File;

type TryOnFiles = {
  modelImage?: UploadedImageFile[];
  garmentImage?: UploadedImageFile[];
};

type TryOnWarnings = {
  hasWarnings: boolean;
  warnings: string[];
  suggestions: string[];
  suggestedFilters: {
    gender: string;
    ageGroup?: string;
  };
};

@Injectable()
export class VirtualTryonServiceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly personAnalysisService: PersonAnalysisService,
    @InjectRepository(TryonHistory)
    private readonly tryonHistoryRepository: Repository<TryonHistory>,
  ) {}

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    return userId;
  }

  private fileToBase64(
    file: UploadedImageFile | undefined,
    fieldName: string,
  ): string {
    if (!file) {
      const label =
        fieldName === 'modelImage'
          ? 'Ảnh người mẫu'
          : fieldName === 'garmentImage'
            ? 'Ảnh sản phẩm'
            : fieldName;

      throw new BadRequestException(`${label} là bắt buộc.`);
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(`${fieldName} phải là tệp hình ảnh.`);
    }

    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  private parseRecommendedAgeGroups(dto: CreateTryOnDto): string[] {
    return dto.recommendedAgeGroups
      ? dto.recommendedAgeGroups
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private isPoseError(error: unknown): boolean {
    const errorText = JSON.stringify(error).toLowerCase();

    return (
      errorText.includes('poseerror') ||
      (errorText.includes('pose') && errorText.includes('error'))
    );
  }

  private buildPoseErrorException(): BadRequestException {
    return new BadRequestException({
      success: false,
      code: 'POSE_ERROR',
      message:
        'Ảnh người mẫu chưa phù hợp để thử đồ. Vui lòng tải ảnh toàn thân, đứng thẳng, thấy rõ cơ thể.',
    });
  }

  private buildFashnException(error: unknown): BadRequestException {
    if (this.isPoseError(error)) {
      return this.buildPoseErrorException();
    }

    if (axios.isAxiosError(error)) {
      const providerMessage =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || error.message;

      return new BadRequestException({
        success: false,
        message:
          typeof providerMessage === 'string'
            ? providerMessage
            : 'Không thể tạo ảnh thử đồ lúc này.',
      });
    }

    return new BadRequestException({
      success: false,
      message: 'Không thể tạo ảnh thử đồ lúc này.',
    });
  }

  private buildTryOnWarnings(
    analysis: any,
    dto: CreateTryOnDto,
  ): TryOnWarnings {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const targetGender = dto.targetGender || 'unisex';
    const recommendedAgeGroups = this.parseRecommendedAgeGroups(dto);

    if (
      targetGender !== 'unisex' &&
      analysis?.gender &&
      analysis.gender !== targetGender
    ) {
      warnings.push(
        `Sản phẩm này phù hợp hơn với giới tính ${targetGender}, nhưng ảnh được nhận diện là ${analysis.gender}.`,
      );

      suggestions.push(
        analysis.gender === 'male'
          ? 'Gợi ý xem thêm các sản phẩm nam hoặc unisex.'
          : 'Gợi ý xem thêm các sản phẩm nữ hoặc unisex.',
      );
    }

    if (
      recommendedAgeGroups.length > 0 &&
      analysis?.ageGroup &&
      !recommendedAgeGroups.includes(analysis.ageGroup)
    ) {
      warnings.push(
        `Sản phẩm này được khuyến nghị cho nhóm tuổi ${recommendedAgeGroups.join(
          ', ',
        )}, nhưng ảnh được nhận diện thuộc nhóm ${analysis.ageGroup}.`,
      );

      suggestions.push(
        `Gợi ý xem sản phẩm phù hợp với nhóm tuổi ${analysis.ageGroup}.`,
      );
    }

    return {
      hasWarnings: warnings.length > 0,
      warnings,
      suggestions,
      suggestedFilters: {
        gender: analysis?.gender || 'unisex',
        ageGroup: analysis?.ageGroup,
      },
    };
  }

  private buildHistoryPayload(
    dto: CreateTryOnDto,
    userId: string | undefined,
    analysis: any,
    warningResult: TryOnWarnings,
  ) {
    return {
      productId: dto.productId || undefined,
      userId: userId || undefined,
      detectedGender: analysis?.gender,
      genderConfidence: analysis?.genderConfidence,
      detectedAgeGroup: analysis?.ageGroup,
      ageConfidence: analysis?.ageConfidence,
      targetGender: dto.targetGender || 'unisex',
      recommendedAgeGroups: this.parseRecommendedAgeGroups(dto),
      warnings: warningResult.warnings,
      suggestions: warningResult.suggestions,
      rawAnalysis: analysis,
      userConfirmed: dto.confirmWarnings === 'true',
    };
  }

  async createTryOn(
    files: TryOnFiles = {},
    dto: CreateTryOnDto,
    userId?: string,
  ) {
    const resolvedUserId = this.requireUserId(userId);
    const apiKey = this.configService.get<string>('FASHN_API_KEY');
    const apiUrl =
      this.configService.get<string>('FASHN_API_URL') ||
      'https://api.fashn.ai/v1/run';

    if (!apiKey) {
      throw new InternalServerErrorException('Thiếu cấu hình FASHN_API_KEY.');
    }

    const modelFile = files.modelImage?.[0];
    const garmentFile = files.garmentImage?.[0];
    const modelImageBase64 = this.fileToBase64(modelFile, 'modelImage');
    const garmentImageBase64 = this.fileToBase64(garmentFile, 'garmentImage');
    const analysis = await this.personAnalysisService.analyzePerson(
      modelFile as Express.Multer.File,
    );
    const warningResult = this.buildTryOnWarnings(analysis, dto);
    const userConfirmed = dto.confirmWarnings === 'true';

    if (warningResult.hasWarnings && !userConfirmed) {
      await this.tryonHistoryRepository.save({
        status: 'need_confirmation',
        needConfirmation: true,
        ...this.buildHistoryPayload(
          dto,
          resolvedUserId,
          analysis,
          warningResult,
        ),
        userConfirmed: false,
      });

      return {
        success: false,
        needConfirmation: true,
        message:
          'Ảnh hoặc sản phẩm có điểm chưa phù hợp. Vui lòng xác nhận để tiếp tục thử đồ.',
        data: {
          personAnalysis: analysis,
          warnings: warningResult.warnings,
          suggestions: warningResult.suggestions,
          suggestedFilters: warningResult.suggestedFilters,
        },
      };
    }

    if (analysis.genderConfidence < 0.6 || analysis.ageConfidence < 0.6) {
      throw new BadRequestException(
        'Ảnh chưa đủ rõ để nhận diện giới tính và nhóm tuổi.',
      );
    }

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
        data: {
          ...response.data,
          personAnalysis: analysis,
        },
      };
    } catch (error: unknown) {
      throw this.buildFashnException(error);
    }
  }

  async getTryOnResult(id: string) {
    if (!id) {
      throw new BadRequestException('Thiếu mã phiên thử đồ.');
    }

    const apiKey = this.configService.get<string>('FASHN_API_KEY');

    const response = await axios.get(`https://api.fashn.ai/v1/status/${id}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const resultBase64 = response.data.output?.[0];

    if (response.data.status === 'completed' && resultBase64) {
      const { buffer } = this.base64ToBuffer(resultBase64);
      const uploaded = await this.cloudinaryService.uploadBuffer(
        buffer,
        `tryon/results/${id}`,
      );

      return {
        success: true,
        data: {
          id,
          status: 'completed',
          resultUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
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
      throw new BadRequestException('Dữ liệu ảnh trả về không hợp lệ.');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    return { buffer, mimeType };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createTryOnSync(
    files: TryOnFiles,
    dto: CreateTryOnDto,
    userId?: string,
  ) {
    const resolvedUserId = this.requireUserId(userId);
    const created = await this.createTryOn(files, dto, userId);

    if (!created.success && created.needConfirmation) {
      return created;
    }

    const jobId = created.data?.id;
    const personAnalysis = created.data?.personAnalysis;
    const warningResult = this.buildTryOnWarnings(personAnalysis, dto);

    if (!jobId) {
      throw new BadRequestException({
        success: false,
        message: 'Không lấy được mã xử lý từ dịch vụ thử đồ.',
        data: created,
      });
    }

    for (let i = 0; i < 30; i++) {
      await this.sleep(3000);

      const result = await this.getTryOnResult(jobId);

      if (result.data.status === 'completed') {
        await this.tryonHistoryRepository.save({
          fashnJobId: jobId,
          status: 'completed',
          resultUrl: result.data.resultUrl,
          cloudinaryPublicId: result.data.cloudinaryPublicId,
          needConfirmation: false,
          completedAt: new Date(),
          ...this.buildHistoryPayload(
            dto,
            resolvedUserId,
            personAnalysis,
            warningResult,
          ),
        });

        return {
          ...result,
          data: {
            ...result.data,
            personAnalysis,
          },
        };
      }

      if (result.data.status === 'failed') {
        if (this.isPoseError(result.data)) {
          await this.tryonHistoryRepository.save({
            fashnJobId: jobId,
            status: 'failed',
            needConfirmation: false,
            errorCode: 'POSE_ERROR',
            errorMessage:
              'Ảnh người mẫu chưa phù hợp để thử đồ. Vui lòng tải ảnh toàn thân, đứng thẳng, thấy rõ cơ thể.',
            rawProviderResponse: result.data,
            ...this.buildHistoryPayload(
              dto,
              resolvedUserId,
              personAnalysis,
              warningResult,
            ),
          });

          throw this.buildPoseErrorException();
        }

        await this.tryonHistoryRepository.save({
          fashnJobId: jobId,
          status: 'failed',
          rawProviderResponse: result.data,
          errorMessage: result.data.error || 'FASHN try-on failed',
          ...this.buildHistoryPayload(
            dto,
            resolvedUserId,
            personAnalysis,
            warningResult,
          ),
        });

        throw new BadRequestException({
          success: false,
          message: result.data.error || 'Tạo ảnh thử đồ thất bại.',
        });
      }
    }

    return {
      success: false,
      message: 'Ảnh thử đồ vẫn đang được xử lý. Vui lòng kiểm tra lại sau.',
      data: {
        id: jobId,
        status: 'processing',
        personAnalysis,
      },
    };
  }

  async getHistory(userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    return this.tryonHistoryRepository.find({
      where: { userId: resolvedUserId },
      order: {
        createdAt: 'DESC',
      },
      take: 20,
    });
  }

  async getHistoryDetail(id: string, userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    const history = await this.tryonHistoryRepository.findOne({
      where: { id, userId: resolvedUserId },
    });

    if (!history) {
      throw new NotFoundException('Không tìm thấy lịch sử thử đồ.');
    }

    return history;
  }

  async getStats(userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    const where = { userId: resolvedUserId };
    const total = await this.tryonHistoryRepository.count({ where });
    const completed = await this.tryonHistoryRepository.count({
      where: { ...where, status: 'completed' },
    });
    const failed = await this.tryonHistoryRepository.count({
      where: { ...where, status: 'failed' },
    });
    const needConfirmation = await this.tryonHistoryRepository.count({
      where: { ...where, status: 'need_confirmation' },
    });

    return {
      total,
      completed,
      failed,
      needConfirmation,
    };
  }
}
