/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PersonAnalysisService } from './analysis/person-analysis.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateProductDesignDto, CreateTryOnDto } from './dto/create-tryon.dto';
import { TryonHistory } from './entities/tryon-history.entity';
import { AppDataSource } from '@app/database';
import { validateUploadedImage } from '@app/common';

type UploadedImageFile = Express.Multer.File;

type TryOnFiles = {
  modelImage?: UploadedImageFile[];
  garmentImage?: UploadedImageFile[];
};

type ProductDesignFiles = {
  baseGarmentImage?: UploadedImageFile[];
  colorReferenceImage?: UploadedImageFile[];
  patternReferenceImage?: UploadedImageFile[];
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

type PersonAnalysisResult = {
  gender?: string;
  genderConfidence?: number;
  ageGroup?: string;
  ageConfidence?: number;
} | null;

@Injectable()
export class VirtualTryonServiceService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(VirtualTryonServiceService.name);
  private historyDbUnavailable = false;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly personAnalysisService: PersonAnalysisService,
  ) {}

  onModuleInit(): void {
    void this.cleanupExpiredMedia();
    const hours = Number(
      this.configService.get<string>('TRYON_MEDIA_CLEANUP_INTERVAL_HOURS') ?? 6,
    );
    const intervalHours = Number.isFinite(hours) && hours > 0 ? hours : 6;
    this.cleanupTimer = setInterval(
      () => void this.cleanupExpiredMedia(),
      intervalHours * 60 * 60 * 1000,
    );
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private getMediaExpiryDate(): Date {
    const configuredDays = Number(
      this.configService.get<string>('TRYON_RESULT_RETENTION_DAYS') ?? 30,
    );
    const days =
      Number.isInteger(configuredDays) &&
      configuredDays >= 1 &&
      configuredDays <= 365
        ? configuredDays
        : 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private getAnonymousMediaExpiryDate(): Date {
    const configuredHours = Number(
      this.configService.get<string>(
        'TRYON_ANONYMOUS_RESULT_RETENTION_HOURS',
      ) ?? 24,
    );
    const hours =
      Number.isInteger(configuredHours) &&
      configuredHours >= 1 &&
      configuredHours <= 168
        ? configuredHours
        : 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private async expireHistoryMedia(
    repository: Repository<TryonHistory>,
    history: TryonHistory,
  ): Promise<void> {
    if (!history.id || !history.cloudinaryPublicId) {
      return;
    }

    await this.cloudinaryService.deleteImage(history.cloudinaryPublicId);
    await repository.query(
      `UPDATE tryon_service.tryon_histories
       SET status = 'expired', result_url = NULL, cloudinary_public_id = NULL
       WHERE id = $1 AND cloudinary_public_id = $2`,
      [history.id, history.cloudinaryPublicId],
    );
  }

  private async cleanupExpiredMedia(): Promise<void> {
    const repository = await this.getHistoryRepository();
    if (!repository) return;

    const expired = await repository
      .createQueryBuilder('history')
      .where('history.expires_at IS NOT NULL')
      .andWhere('history.expires_at <= NOW()')
      .andWhere('history.cloudinary_public_id IS NOT NULL')
      .orderBy('history.expires_at', 'ASC')
      .take(100)
      .getMany();

    for (const history of expired) {
      try {
        await this.expireHistoryMedia(repository, history);
      } catch (error) {
        this.logger.warn(
          `Failed to clean expired try-on media ${history.id}: ${this.extractProviderErrorMessage(error)}`,
        );
      }
    }
  }

  private async getHistoryRepository(): Promise<Repository<TryonHistory> | null> {
    if (!AppDataSource.isInitialized) {
      try {
        // The shared CLI datasource uses a glob that is not available in the
        // compiled container. Register this service's entity explicitly.
        AppDataSource.setOptions({ entities: [TryonHistory], migrations: [] });
        await AppDataSource.initialize();
        this.historyDbUnavailable = false;
      } catch (error) {
        if (!this.historyDbUnavailable) {
          this.logger.warn(
            `Try-on history database is unavailable, continuing without persistence: ${this.extractProviderErrorMessage(error)}`,
          );
          this.historyDbUnavailable = true;
        }
        return null;
      }
    }

    return AppDataSource.getRepository(TryonHistory);
  }

  private async requireHistoryRepository(): Promise<Repository<TryonHistory>> {
    const repository = await this.getHistoryRepository();

    if (!repository) {
      throw new ServiceUnavailableException(
        'Try-on history is temporarily unavailable.',
      );
    }

    return repository;
  }

  private requireUserId(userId?: string): string {
    if (!userId) {
      throw new UnauthorizedException('Authentication is required');
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

    validateUploadedImage(file, {
      maxBytes: 8 * 1024 * 1024,
      fieldName: this.getImageLabel(fieldName),
    });

    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  private getImageLabel(fieldName: string): string {
    switch (fieldName) {
      case 'modelImage':
        return 'Ảnh người mẫu';
      case 'garmentImage':
        return 'Ảnh sản phẩm';
      case 'baseGarmentImage':
        return 'Ảnh form gốc sản phẩm';
      case 'colorReferenceImage':
        return 'Ảnh màu tham chiếu';
      case 'patternReferenceImage':
        return 'Ảnh hoạ tiết tham chiếu';
      default:
        return fieldName;
    }
  }

  private fileToInlineData(
    file: UploadedImageFile | undefined,
    fieldName: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        `${this.getImageLabel(fieldName)} là bắt buộc.`,
      );
    }

    validateUploadedImage(file, {
      maxBytes: 8 * 1024 * 1024,
      fieldName: this.getImageLabel(fieldName),
    });

    return {
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    };
  }

  private extractInlineImageData(response: {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            data?: string;
            mimeType?: string;
          };
          text?: string;
        }>;
      };
    }>;
    text?: () => string;
  }) {
    const parts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        return part.inlineData;
      }
    }

    return null;
  }

  private buildProductDesignPrompt(): string {
    return [
      "Create a clean front-facing product image of a women's sleepwear top.",
      '',
      'Use the garment shape and silhouette from the source/base garment image.',
      'Use the main color, color tone, and fabric color style from the COLOR REFERENCE image.',
      'Use the pattern, print, or motif from the PATTERN REFERENCE image.',
      '',
      'Combine the color and the pattern into one coherent final garment design.',
      'Do not create a split half-and-half garment.',
      'Do not place two garments side by side.',
      'Do not copy the entire color reference garment.',
      'Do not copy the entire pattern reference garment.',
      'Only use the color from the color reference and only use the pattern from the pattern reference.',
      '',
      'Keep the garment realistic, centered, front-facing, and suitable for virtual try-on.',
      'Keep the fabric texture natural and soft like sleepwear.',
      'Use a clean white background.',
      'Do not add a person, mannequin, hanger, text, logo, watermark, or extra accessories.',
    ].join('\n');
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

  private extractProviderErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return String(error);
  }

  private isGeminiQuotaError(error: unknown): boolean {
    const errorText = this.extractProviderErrorMessage(error).toLowerCase();

    return (
      errorText.includes('429') ||
      errorText.includes('quota exceeded') ||
      errorText.includes('too many requests') ||
      errorText.includes('rate limit') ||
      errorText.includes('generate_content_free_tier')
    );
  }

  private buildGeminiQuotaException(): HttpException {
    return new HttpException(
      {
        success: false,
        code: 'GEMINI_QUOTA_EXCEEDED',
        message:
          'Bản demo try-on mới đang tạm hết quota Gemini để tạo ảnh. Vui lòng thử lại sau hoặc cấu hình API key Gemini có billing/quota khả dụng.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async analyzePersonSafely(
    modelFile: UploadedImageFile | undefined,
  ): Promise<PersonAnalysisResult> {
    if (!modelFile) {
      return null;
    }

    try {
      const result: unknown =
        await this.personAnalysisService.analyzePerson(modelFile);
      if (!result || typeof result !== 'object') return null;
      const record = result as Record<string, unknown>;
      return {
        gender: typeof record.gender === 'string' ? record.gender : undefined,
        genderConfidence:
          typeof record.genderConfidence === 'number'
            ? record.genderConfidence
            : undefined,
        ageGroup:
          typeof record.ageGroup === 'string' ? record.ageGroup : undefined,
        ageConfidence:
          typeof record.ageConfidence === 'number'
            ? record.ageConfidence
            : undefined,
      };
    } catch (error) {
      this.logger.warn(
        `Person analysis failed, continuing without metadata check: ${this.extractProviderErrorMessage(error)}`,
      );
      return null;
    }
  }

  private async saveHistorySafely(
    payload: Partial<TryonHistory>,
  ): Promise<TryonHistory | null> {
    const repository = await this.getHistoryRepository();

    if (!repository) {
      return null;
    }

    try {
      return await repository.save(payload);
    } catch (error) {
      this.logger.warn(
        `Failed to save try-on history: ${this.extractProviderErrorMessage(error)}`,
      );
      return null;
    }
  }

  private buildTryOnWarnings(
    analysis: PersonAnalysisResult,
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
    analysis: PersonAnalysisResult,
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
      rawAnalysis: analysis ?? undefined,
      userConfirmed: dto.confirmWarnings === 'true',
    };
  }

  async createTryOn(files: TryOnFiles = {}, dto: CreateTryOnDto) {
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
    const analysis = await this.analyzePersonSafely(modelFile);
    const warningResult = this.buildTryOnWarnings(analysis, dto);
    const userConfirmed = dto.confirmWarnings === 'true';

    if (warningResult.hasWarnings && !userConfirmed) {
      await this.saveHistorySafely({
        status: 'need_confirmation',
        needConfirmation: true,
        ...this.buildHistoryPayload(dto, undefined, analysis, warningResult),
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

    if (
      analysis &&
      ((analysis.genderConfidence ?? 0) < 0.6 ||
        (analysis.ageConfidence ?? 0) < 0.6)
    ) {
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

      const jobId = response.data?.id as string | undefined;
      if (!jobId) {
        throw new BadRequestException(
          'Dịch vụ thử đồ không trả về mã phiên xử lý.',
        );
      }
      await this.saveHistorySafely({
        fashnJobId: jobId,
        status: 'pending',
        needConfirmation: false,
        ...this.buildHistoryPayload(dto, undefined, analysis, warningResult),
      });

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

  async getTryOnResult(id: string, userId?: string) {
    if (!id) {
      throw new BadRequestException('Thiếu mã phiên thử đồ.');
    }
    const repository = await this.requireHistoryRepository();
    const historyQuery = repository
      .createQueryBuilder('history')
      .where('history.fashn_job_id = :id', { id });

    if (userId) {
      historyQuery.andWhere(
        '(history.user_id IS NULL OR history.user_id = :userId)',
        { userId },
      );
    } else {
      historyQuery.andWhere('history.user_id IS NULL');
    }

    const history = await historyQuery.getOne();
    if (!history) {
      throw new NotFoundException('Không tìm thấy phiên thử đồ.');
    }
    if (history.expiresAt && history.expiresAt.getTime() <= Date.now()) {
      try {
        await this.expireHistoryMedia(repository, history);
      } catch (error) {
        this.logger.warn(
          `Failed to expire try-on media ${history.id}: ${this.extractProviderErrorMessage(error)}`,
        );
      }
      throw new GoneException('Ảnh thử đồ đã hết thời hạn lưu trữ.');
    }
    if (history.status === 'completed' && history.resultUrl) {
      return {
        success: true,
        data: {
          id,
          status: 'completed',
          resultUrl: history.resultUrl,
          cloudinaryPublicId: history.cloudinaryPublicId,
        },
      };
    }

    const apiKey = this.configService.get<string>('FASHN_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Thiáº¿u cáº¥u hÃ¬nh FASHN_API_KEY.',
      );
    }

    let response;
    try {
      response = await axios.get(`https://api.fashn.ai/v1/status/${id}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      throw this.buildFashnException(error);
    }

    const resultBase64 = response.data.output?.[0];

    if (response.data.status === 'completed' && resultBase64) {
      let uploaded: { url: string; publicId: string } | undefined;
      try {
        const { buffer } = this.base64ToBuffer(resultBase64);
        uploaded = await this.cloudinaryService.uploadBuffer(
          buffer,
          `tryon/results/${id}`,
          'result',
        );
        const update = await repository.update(
          { id: history.id },
          {
            status: 'completed',
            resultUrl: uploaded.url,
            cloudinaryPublicId: uploaded.publicId,
            completedAt: new Date(),
            expiresAt: this.getAnonymousMediaExpiryDate(),
          },
        );
        if (update.affected !== 1) {
          throw new Error('Try-on history was not updated after media upload');
        }

        return {
          success: true,
          data: {
            id,
            status: 'completed',
            resultUrl: uploaded.url,
            cloudinaryPublicId: uploaded.publicId,
          },
        };
      } catch (error) {
        if (uploaded?.publicId) {
          try {
            await this.cloudinaryService.deleteImage(uploaded.publicId);
          } catch (cleanupError) {
            this.logger.error(
              `Failed to rollback untracked try-on media ${uploaded.publicId}: ${this.extractProviderErrorMessage(cleanupError)}`,
            );
          }
        }
        this.logger.warn(
          `Cloudinary upload failed, returning base64 result directly: ${this.extractProviderErrorMessage(error)}`,
        );

        return {
          success: true,
          data: {
            id,
            status: 'completed',
            resultUrl: resultBase64,
          },
        };
      }
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

  async createTryOnSync(files: TryOnFiles, dto: CreateTryOnDto) {
    const created = await this.createTryOn(files, dto);

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
          await this.saveHistorySafely({
            fashnJobId: jobId,
            status: 'failed',
            needConfirmation: false,
            errorCode: 'POSE_ERROR',
            errorMessage:
              'Ảnh người mẫu chưa phù hợp để thử đồ. Vui lòng tải ảnh toàn thân, đứng thẳng, thấy rõ cơ thể.',
            rawProviderResponse: result.data,
            ...this.buildHistoryPayload(
              dto,
              undefined,
              personAnalysis,
              warningResult,
            ),
          });

          throw this.buildPoseErrorException();
        }

        await this.saveHistorySafely({
          fashnJobId: jobId,
          status: 'failed',
          rawProviderResponse: result.data,
          errorMessage: result.data.error || 'FASHN try-on failed',
          ...this.buildHistoryPayload(
            dto,
            undefined,
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

  async createProductDesignSync(
    files: ProductDesignFiles,
    dto: CreateProductDesignDto,
  ) {
    const apiKey =
      this.configService.get<string>('TRYON_GEMINI_API_KEY') ||
      this.configService.get<string>('GEMINI_API_KEY');
    const modelName =
      this.configService.get<string>('TRYON_GEMINI_IMAGE_MODEL') ||
      this.configService.get<string>('GEMINI_IMAGE_MODEL') ||
      'gemini-2.5-flash-image';

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Thiếu cấu hình TRYON_GEMINI_API_KEY hoặc GEMINI_API_KEY.',
      );
    }

    const baseGarmentFile = files.baseGarmentImage?.[0];
    const colorReferenceFile = files.colorReferenceImage?.[0];
    const patternReferenceFile = files.patternReferenceImage?.[0];

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: modelName });

    try {
      const result = await model.generateContent([
        this.fileToInlineData(baseGarmentFile, 'baseGarmentImage'),
        this.fileToInlineData(colorReferenceFile, 'colorReferenceImage'),
        this.fileToInlineData(patternReferenceFile, 'patternReferenceImage'),
        this.buildProductDesignPrompt(),
      ]);

      const generatedImage = this.extractInlineImageData(result.response);

      if (!generatedImage?.data || !generatedImage.mimeType) {
        const fallbackText =
          typeof result.response.text === 'function'
            ? result.response.text().trim()
            : '';

        throw new BadRequestException(
          fallbackText ||
            'Gemini không trả về ảnh. Kiểm tra model trong biến TRYON_GEMINI_IMAGE_MODEL hoặc GEMINI_IMAGE_MODEL.',
        );
      }

      const buffer = Buffer.from(generatedImage.data, 'base64');
      const uploaded = await this.cloudinaryService.uploadBuffer(
        buffer,
        'tryon/product-designs/temporary',
      );

      const persisted = await this.saveHistorySafely({
        productId: dto.productId,
        status: 'completed',
        resultUrl: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        completedAt: new Date(),
        expiresAt: this.getAnonymousMediaExpiryDate(),
      });
      if (!persisted) {
        try {
          await this.cloudinaryService.deleteImage(uploaded.publicId);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to rollback untracked product-design media ${uploaded.publicId}: ${this.extractProviderErrorMessage(cleanupError)}`,
          );
        }
        throw new ServiceUnavailableException(
          'Không thể lưu thông tin quản lý ảnh thiết kế, vui lòng thử lại.',
        );
      }

      return {
        success: true,
        data: {
          id: persisted.id,
          status: 'completed',
          resultUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Product design generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      if (this.isGeminiQuotaError(error)) {
        throw this.buildGeminiQuotaException();
      }

      throw new BadRequestException({
        success: false,
        message: 'Không thể tạo ảnh sản phẩm từ các ảnh tham chiếu lúc này.',
      });
    }
  }

  async saveTryOnResult(resultId: string, userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    const repository = await this.requireHistoryRepository();
    const historyQuery = repository.createQueryBuilder('history');

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        resultId,
      )
    ) {
      historyQuery.where(
        '(history.id = :resultId OR history.fashn_job_id = :resultId)',
        { resultId },
      );
    } else {
      historyQuery.where('history.fashn_job_id = :resultId', { resultId });
    }

    const history = await historyQuery.getOne();
    if (!history?.id || history.status !== 'completed' || !history.resultUrl) {
      throw new NotFoundException('Không tìm thấy kết quả thử đồ đã hoàn tất.');
    }

    if (history.userId && history.userId !== resolvedUserId) {
      throw new NotFoundException('Không tìm thấy kết quả thử đồ đã hoàn tất.');
    }

    if (!history.userId) {
      const update = await repository
        .createQueryBuilder()
        .update(TryonHistory)
        .set({
          userId: resolvedUserId,
          expiresAt: this.getMediaExpiryDate(),
        })
        .where('id = :historyId', { historyId: history.id })
        .andWhere('user_id IS NULL')
        .execute();

      if (update.affected !== 1) {
        const claimed = await repository.findOne({
          where: { id: history.id, userId: resolvedUserId },
        });
        if (!claimed) {
          throw new NotFoundException(
            'Kết quả thử đồ đã được lưu bởi tài khoản khác.',
          );
        }
        return claimed;
      }
    }

    const saved = await repository.findOne({
      where: { id: history.id, userId: resolvedUserId },
    });
    if (!saved) {
      throw new NotFoundException('Không thể lưu kết quả thử đồ.');
    }

    return saved;
  }
  async getHistory(userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    const repository = await this.requireHistoryRepository();
    return repository.find({
      where: { userId: resolvedUserId },
      order: {
        createdAt: 'DESC',
      },
      take: 20,
    });
  }

  async getHistoryDetail(id: string, userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    const repository = await this.requireHistoryRepository();
    const history = await repository.findOne({
      where: { id, userId: resolvedUserId },
    });

    if (!history) {
      throw new NotFoundException('Không tìm thấy lịch sử thử đồ.');
    }

    return history;
  }

  async getStats(userId?: string) {
    const resolvedUserId = this.requireUserId(userId);
    const repository = await this.requireHistoryRepository();
    const where = { userId: resolvedUserId };
    const total = await repository.count({ where });
    const completed = await repository.count({
      where: { ...where, status: 'completed' },
    });
    const failed = await repository.count({
      where: { ...where, status: 'failed' },
    });
    const needConfirmation = await repository.count({
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
