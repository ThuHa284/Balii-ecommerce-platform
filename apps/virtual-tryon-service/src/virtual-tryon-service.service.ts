/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PersonAnalysisService } from './analysis/person-analysis.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateProductDesignDto, CreateTryOnDto } from './dto/create-tryon.dto';
import { TryonHistory } from './entities/tryon-history.entity';

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

@Injectable()
export class VirtualTryonServiceService {
  private readonly logger = new Logger(VirtualTryonServiceService.name);

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

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        `${this.getImageLabel(fieldName)} phải là tệp hình ảnh.`,
      );
    }

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
        ...this.buildHistoryPayload(dto, userId, analysis, warningResult),
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
            userId,
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
              userId,
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
            userId,
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
    userId?: string,
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
        `tryon/product-designs/${userId || 'anonymous'}`,
      );

      return {
        success: true,
        data: {
          id: dto.productId || `product_design_${Date.now()}`,
          status: 'completed',
          resultUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Product design generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof BadRequestException) {
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
