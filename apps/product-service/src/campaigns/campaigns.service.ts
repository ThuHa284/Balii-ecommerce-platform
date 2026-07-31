import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Campaign } from '../entities/campaign.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import {
  CreateCampaignDto,
  CampaignDiscountType,
} from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCampaignDto) {
    this.validateCampaign(
      dto.startAt,
      dto.endAt,
      dto.discountType,
      dto.discountValue,
    );
    await this.validateGiftRule(dto);

    const campaign = this.campaignRepo.create({
      ...dto,
      productIds: dto.productIds ?? [],
      discountValue: dto.discountValue ?? null,
      giftName: dto.giftName?.trim() || null,
      giftDescription: dto.giftDescription?.trim() || null,
      minimumPurchaseQuantity: dto.minimumPurchaseQuantity ?? 1,
      giftVariantId: dto.giftVariantId ?? null,
      giftQuantity: dto.giftQuantity ?? 0,
      giftUnitPrice: dto.giftUnitPrice ?? 0,
      repeatable: dto.repeatable ?? true,
      maxApplications: dto.maxApplications ?? null,
      stackableWithSale: dto.stackableWithSale ?? false,
      badgeText: dto.badgeText?.trim() || null,
      priorityOrder: dto.priorityOrder ?? 0,
      isActive: dto.isActive ?? true,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });

    const saved = await this.campaignRepo.save(campaign);
    await this.cloudinaryService.syncOwnerAssets('campaign', String(saved.id), [
      saved.imageUrl,
      saved.bannerImageUrl,
    ]);
    return this.toFrontendCampaign(saved);
  }

  async findAll(includeInactive = false) {
    const campaigns = await this.campaignRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: {
        priorityOrder: 'DESC',
        createdAt: 'DESC',
      },
    });

    return campaigns.map((campaign) => this.toFrontendCampaign(campaign));
  }

  async findActive() {
    const campaigns = await this.campaignRepo.find({
      where: { isActive: true },
      order: {
        priorityOrder: 'DESC',
        startAt: 'ASC',
        createdAt: 'DESC',
      },
    });

    const now = new Date();
    return campaigns
      .filter((campaign) => this.isCampaignLive(campaign, now))
      .map((campaign) => this.toFrontendCampaign(campaign));
  }

  async findOne(id: string, includeInactive = false) {
    const campaign = await this.campaignRepo.findOne({
      where: includeInactive ? { id } : { id, isActive: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.toFrontendCampaign(campaign);
  }

  async findBySlug(slug: string) {
    const campaign = await this.campaignRepo.findOne({
      where: { slug, isActive: true },
    });

    if (!campaign || !this.isCampaignLive(campaign, new Date())) {
      throw new NotFoundException('Campaign not found');
    }

    return this.toFrontendCampaign(campaign);
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.campaignRepo.findOne({ where: { id } });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const nextStartAt = dto.startAt ?? campaign.startAt?.toISOString() ?? '';
    const nextEndAt = dto.endAt ?? campaign.endAt?.toISOString() ?? '';
    const nextDiscountType =
      dto.discountType ?? (campaign.discountType as CampaignDiscountType);
    const nextDiscountValue =
      dto.discountValue ?? Number(campaign.discountValue ?? 0);

    this.validateCampaign(
      nextStartAt,
      nextEndAt,
      nextDiscountType,
      nextDiscountValue,
    );
    await this.validateGiftRule({
      discountType: nextDiscountType,
      giftVariantId: dto.giftVariantId ?? campaign.giftVariantId ?? undefined,
      giftQuantity: dto.giftQuantity ?? campaign.giftQuantity ?? 0,
      minimumPurchaseQuantity:
        dto.minimumPurchaseQuantity ?? campaign.minimumPurchaseQuantity ?? 1,
    });

    Object.assign(campaign, dto, {
      productIds: dto.productIds ?? campaign.productIds ?? [],
      discountValue: dto.discountValue ?? campaign.discountValue ?? null,
      giftName:
        dto.giftName !== undefined
          ? dto.giftName.trim() || null
          : campaign.giftName,
      giftDescription:
        dto.giftDescription !== undefined
          ? dto.giftDescription.trim() || null
          : campaign.giftDescription,
      giftVariantId:
        dto.giftVariantId !== undefined
          ? dto.giftVariantId || null
          : campaign.giftVariantId,
      badgeText:
        dto.badgeText !== undefined
          ? dto.badgeText.trim() || null
          : campaign.badgeText,
      startAt: dto.startAt ? new Date(dto.startAt) : campaign.startAt,
      endAt: dto.endAt ? new Date(dto.endAt) : campaign.endAt,
      updatedAt: new Date(),
    });

    const saved = await this.campaignRepo.save(campaign);
    await this.cloudinaryService.syncOwnerAssets('campaign', String(saved.id), [
      saved.imageUrl,
      saved.bannerImageUrl,
    ]);
    return this.toFrontendCampaign(saved);
  }

  async remove(id: string) {
    const campaign = await this.campaignRepo.findOne({ where: { id } });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.campaignRepo.delete(id);
    await this.cloudinaryService.releaseOwnerAssets('campaign', id);

    return {
      success: true,
      message: 'Campaign deleted successfully',
    };
  }

  async uploadImage(file: Express.Multer.File, kind: 'cover' | 'banner') {
    const folder =
      kind === 'banner'
        ? process.env.CLOUDINARY_CAMPAIGN_BANNER_FOLDER ||
          'balii/campaigns/banners'
        : process.env.CLOUDINARY_CAMPAIGN_FOLDER || 'balii/campaigns';

    const uploaded = await this.cloudinaryService.uploadImage(file, folder);

    return {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  private validateCampaign(
    startAt: string,
    endAt: string,
    discountType: CampaignDiscountType,
    discountValue?: number | null,
  ) {
    if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      throw new BadRequestException(
        'Campaign end time must be after start time',
      );
    }

    if (discountType === CampaignDiscountType.PERCENT) {
      if (discountValue == null || discountValue <= 0 || discountValue > 100) {
        throw new BadRequestException(
          'Percent discount must be between 0 and 100',
        );
      }
    }

    if (discountType === CampaignDiscountType.AMOUNT) {
      if (discountValue == null || discountValue <= 0) {
        throw new BadRequestException('Amount discount must be greater than 0');
      }
    }
  }

  private isCampaignLive(campaign: Campaign, now: Date) {
    const start = campaign.startAt ? new Date(campaign.startAt).getTime() : 0;
    const end = campaign.endAt ? new Date(campaign.endAt).getTime() : 0;
    const current = now.getTime();

    return Boolean(campaign.isActive) && start <= current && current <= end;
  }

  private toFrontendCampaign(campaign: Campaign) {
    return {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description ?? '',
      shortDescription: campaign.shortDescription ?? '',
      image: campaign.imageUrl ?? '',
      bannerImage: campaign.bannerImageUrl ?? '',
      productIds: campaign.productIds ?? [],
      discountType: campaign.discountType,
      discountValue:
        campaign.discountValue != null ? Number(campaign.discountValue) : null,
      giftName: campaign.giftName ?? '',
      giftDescription: campaign.giftDescription ?? '',
      minimumPurchaseQuantity: campaign.minimumPurchaseQuantity ?? 1,
      giftVariantId: campaign.giftVariantId ?? null,
      giftQuantity: campaign.giftQuantity ?? 0,
      giftUnitPrice: Number(campaign.giftUnitPrice ?? 0),
      repeatable: campaign.repeatable ?? true,
      maxApplications: campaign.maxApplications ?? null,
      stackableWithSale: campaign.stackableWithSale ?? false,
      badgeText: campaign.badgeText ?? '',
      priorityOrder: campaign.priorityOrder ?? 0,
      startAt: campaign.startAt,
      endAt: campaign.endAt,
      isActive: campaign.isActive ?? true,
      isLive: this.isCampaignLive(campaign, new Date()),
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  private async validateGiftRule(input: {
    discountType: CampaignDiscountType;
    giftVariantId?: string;
    giftQuantity?: number;
    minimumPurchaseQuantity?: number;
  }) {
    if (input.discountType !== CampaignDiscountType.GIFT) {
      return;
    }

    if (
      !input.giftVariantId ||
      !input.giftQuantity ||
      input.giftQuantity < 1 ||
      !input.minimumPurchaseQuantity ||
      input.minimumPurchaseQuantity < 1
    ) {
      throw new BadRequestException(
        'Gift campaign requires a gift variant, purchase quantity and gift quantity',
      );
    }

    const giftVariant = await this.dataSource
      .getRepository(ProductVariant)
      .findOne({
        where: { id: input.giftVariantId, isActive: true },
      });

    if (!giftVariant) {
      throw new BadRequestException(
        'Gift variant does not exist or is inactive',
      );
    }
  }
}
