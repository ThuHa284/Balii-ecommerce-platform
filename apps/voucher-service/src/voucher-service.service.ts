/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  CreateVoucherDto,
  VoucherDiscountType,
} from './dto/create-voucher.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { UserVoucher } from './entities/user-voucher.entity';
import { Voucher } from './entities/voucher.entity';
import { VoucherUsage } from './entities/voucher-usage.entity';

type VoucherRow = {
  id: string;
  code: string;
  typeId: number;
  typeCode: string;
  typeLabel: string;
  discountValue: number | string;
  maxDiscountAmount: number | string | null;
  minOrderAmount: number | string;
  usageLimit: number | null;
  usedCount: number | string;
  userLimitPerUser: number | string;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
};

type VoucherUsageRow = {
  id: string;
  voucherId: string;
  userId: string;
  orderId: string;
  discountApplied: number | string;
  usedAt: Date;
  voucherCode: string;
  voucherType: string;
};

type UserVoucherRow = {
  userVoucherId: string;
  voucherId: string;
  userId: string;
  savedAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
} & VoucherRow;

@Injectable()
export class VoucherServiceService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly voucherUsageRepository: Repository<VoucherUsage>,
    @InjectRepository(UserVoucher)
    private readonly userVoucherRepository: Repository<UserVoucher>,
    private readonly dataSource: DataSource,
  ) {}

  async findAvailable(orderAmount?: number, userId?: string) {
    const rows = await this.dataSource.query(
      `
      SELECT
        v.id,
        v.code,
        v.type_id AS "typeId",
        vt.code AS "typeCode",
        vt.label AS "typeLabel",
        v.discount_value AS "discountValue",
        v.max_discount_amount AS "maxDiscountAmount",
        v.min_order_amount AS "minOrderAmount",
        v.usage_limit AS "usageLimit",
        v.used_count AS "usedCount",
        v.user_limit_per_user AS "userLimitPerUser",
        v.starts_at AS "startsAt",
        v.expires_at AS "expiresAt",
        v.is_active AS "isActive",
        v.created_by AS "createdBy",
        v.created_at AS "createdAt"
      FROM voucher_service.vouchers v
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      WHERE v.is_active = TRUE
        AND v.starts_at <= NOW()
        AND v.expires_at >= NOW()
        AND (v.usage_limit IS NULL OR v.used_count < v.usage_limit)
      ORDER BY v.created_at DESC
      `,
    );

    return (rows as VoucherRow[])
      .map((row) => this.toVoucherResponse(row))
      .filter((voucher) => {
        if (orderAmount != null && voucher.minOrderValue > orderAmount) {
          return false;
        }

        if (!userId) {
          return true;
        }

        return true;
      });
  }

  async findByCode(code: string) {
    const row = await this.getVoucherRowByCode(code);
    return this.toVoucherResponse(row);
  }

  async findAllAdmin() {
    const rows = await this.dataSource.query(
      `
      SELECT
        v.id,
        v.code,
        v.type_id AS "typeId",
        vt.code AS "typeCode",
        vt.label AS "typeLabel",
        v.discount_value AS "discountValue",
        v.max_discount_amount AS "maxDiscountAmount",
        v.min_order_amount AS "minOrderAmount",
        v.usage_limit AS "usageLimit",
        v.used_count AS "usedCount",
        v.user_limit_per_user AS "userLimitPerUser",
        v.starts_at AS "startsAt",
        v.expires_at AS "expiresAt",
        v.is_active AS "isActive",
        v.created_by AS "createdBy",
        v.created_at AS "createdAt"
      FROM voucher_service.vouchers v
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      ORDER BY v.created_at DESC
      `,
    );

    return (rows as VoucherRow[]).map((row) => this.toVoucherResponse(row));
  }

  async findOneAdmin(id: string) {
    const row = await this.getVoucherRowById(id);
    return this.toVoucherResponse(row);
  }

  async create(dto: CreateVoucherDto, createdBy?: string) {
    this.validateDateRange(dto.startDate, dto.endDate);
    this.validateDiscountPayload(
      dto.discountType,
      dto.discountValue,
      dto.maxDiscount,
    );

    const voucher = this.voucherRepository.create({
      code: dto.code.trim().toUpperCase(),
      typeId: await this.getVoucherTypeId(dto.discountType),
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscount ?? null,
      minOrderAmount: dto.minOrderValue ?? 0,
      usageLimit: dto.usageLimit ?? null,
      usedCount: 0,
      userLimitPerUser: dto.userLimitPerUser ?? 1,
      startsAt: new Date(dto.startDate),
      expiresAt: new Date(dto.endDate),
      isActive: dto.isActive ?? true,
      createdBy: createdBy ?? null,
    });

    const savedVoucher = await this.voucherRepository.save(voucher);
    return this.findOneAdmin(savedVoucher.id);
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const voucher = await this.voucherRepository.findOne({ where: { id } });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    const nextTypeCode =
      dto.discountType ?? (await this.getVoucherTypeCode(voucher.typeId));
    const nextDiscountValue =
      dto.discountValue ?? Number(voucher.discountValue);
    const nextMaxDiscount =
      dto.maxDiscount !== undefined
        ? dto.maxDiscount
        : voucher.maxDiscountAmount;

    if (dto.startDate || dto.endDate) {
      this.validateDateRange(
        dto.startDate ?? voucher.startsAt.toISOString(),
        dto.endDate ?? voucher.expiresAt.toISOString(),
      );
    }

    this.validateDiscountPayload(
      nextTypeCode,
      nextDiscountValue,
      nextMaxDiscount,
    );

    if (dto.code !== undefined) {
      voucher.code = dto.code.trim().toUpperCase();
    }

    if (dto.discountType !== undefined) {
      voucher.typeId = await this.getVoucherTypeId(dto.discountType);
    }

    if (dto.discountValue !== undefined) {
      voucher.discountValue = dto.discountValue;
    }

    if (dto.maxDiscount !== undefined) {
      voucher.maxDiscountAmount = dto.maxDiscount;
    }

    if (dto.minOrderValue !== undefined) {
      voucher.minOrderAmount = dto.minOrderValue;
    }

    if (dto.usageLimit !== undefined) {
      voucher.usageLimit = dto.usageLimit;
    }

    if (dto.userLimitPerUser !== undefined) {
      voucher.userLimitPerUser = dto.userLimitPerUser;
    }

    if (dto.startDate !== undefined) {
      voucher.startsAt = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      voucher.expiresAt = new Date(dto.endDate);
    }

    if (dto.isActive !== undefined) {
      voucher.isActive = dto.isActive;
    }

    await this.voucherRepository.save(voucher);
    return this.findOneAdmin(id);
  }

  async remove(id: string) {
    const voucher = await this.voucherRepository.findOne({ where: { id } });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    voucher.isActive = false;
    await this.voucherRepository.save(voucher);

    return {
      success: true,
      message: 'Voucher disabled successfully',
    };
  }

  async validateVoucher(dto: ValidateVoucherDto, headerUserId?: string) {
    const userId = dto.userId ?? headerUserId;
    const row = await this.getVoucherRowByCode(dto.code);
    const validation = await this.assertVoucherUsable(
      row,
      dto.orderAmount,
      userId,
      this.dataSource.manager,
    );

    return {
      valid: true,
      discountAmount: validation.discountAmount,
      finalAmount: Math.max(0, dto.orderAmount - validation.discountAmount),
      voucher: this.toVoucherResponse(row),
    };
  }

  async redeemVoucher(userId: string | undefined, dto: RedeemVoucherDto) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    return this.dataSource.transaction(async (manager) => {
      const row = await this.getVoucherRowByCode(dto.code, manager, true);
      const validation = await this.assertVoucherUsable(
        row,
        dto.orderAmount,
        userId,
        manager,
      );

      const duplicatedUsage = await manager.query(
        `
        SELECT id
        FROM voucher_service.voucher_usages
        WHERE voucher_id = $1 AND order_id = $2
        LIMIT 1
        `,
        [row.id, dto.orderId],
      );

      if (duplicatedUsage.length) {
        throw new BadRequestException(
          'Voucher already redeemed for this order',
        );
      }

      await manager.query(
        `
        UPDATE voucher_service.vouchers
        SET used_count = used_count + 1
        WHERE id = $1
        `,
        [row.id],
      );

      const usageRows = await manager.query(
        `
        INSERT INTO voucher_service.voucher_usages (
          voucher_id,
          user_id,
          order_id,
          discount_applied
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          voucher_id AS "voucherId",
          user_id AS "userId",
          order_id AS "orderId",
          discount_applied AS "discountApplied",
          used_at AS "usedAt"
        `,
        [row.id, userId, dto.orderId, validation.discountAmount],
      );

      return {
        success: true,
        discountAmount: validation.discountAmount,
        finalAmount: Math.max(0, dto.orderAmount - validation.discountAmount),
        usage: usageRows[0],
        voucher: this.toVoucherResponse({
          ...row,
          usedCount: Number(row.usedCount) + 1,
        }),
      };
    });
  }

  async findMySavedVouchers(userId: string | undefined) {
    if (!userId) {
      return [];
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        uv.id AS "userVoucherId",
        uv.voucher_id AS "voucherId",
        uv.user_id AS "userId",
        uv.saved_at AS "savedAt",
        EXISTS (
          SELECT 1
          FROM voucher_service.voucher_usages vu
          WHERE vu.voucher_id = uv.voucher_id AND vu.user_id = uv.user_id
        ) AS "isUsed",
        (
          SELECT MAX(vu.used_at)
          FROM voucher_service.voucher_usages vu
          WHERE vu.voucher_id = uv.voucher_id AND vu.user_id = uv.user_id
        ) AS "usedAt",
        v.id,
        v.code,
        v.type_id AS "typeId",
        vt.code AS "typeCode",
        vt.label AS "typeLabel",
        v.discount_value AS "discountValue",
        v.max_discount_amount AS "maxDiscountAmount",
        v.min_order_amount AS "minOrderAmount",
        v.usage_limit AS "usageLimit",
        v.used_count AS "usedCount",
        v.user_limit_per_user AS "userLimitPerUser",
        v.starts_at AS "startsAt",
        v.expires_at AS "expiresAt",
        v.is_active AS "isActive",
        v.created_by AS "createdBy",
        v.created_at AS "createdAt"
      FROM voucher_service.user_vouchers uv
      JOIN voucher_service.vouchers v ON v.id = uv.voucher_id
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      WHERE uv.user_id = $1
      ORDER BY uv.saved_at DESC
      `,
      [userId],
    );

    return (rows as UserVoucherRow[]).map((row) => ({
      id: row.userVoucherId,
      voucher: this.toVoucherResponse(row),
      savedAt: row.savedAt,
      isUsed: row.isUsed,
      usedAt: row.usedAt,
    }));
  }

  async saveVoucher(userId: string | undefined, code: string) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const voucher = await this.getVoucherRowByCode(code);
    await this.assertVoucherUsable(
      voucher,
      Number(voucher.minOrderAmount),
      userId,
      this.dataSource.manager,
    );

    const existing = await this.userVoucherRepository.findOne({
      where: {
        voucherId: voucher.id,
        userId,
      },
    });

    if (existing) {
      throw new BadRequestException('Voucher already saved');
    }

    const saved = this.userVoucherRepository.create({
      voucherId: voucher.id,
      userId,
    });

    await this.userVoucherRepository.save(saved);

    return {
      id: saved.id,
      voucher: this.toVoucherResponse(voucher),
      savedAt: saved.savedAt,
      isUsed: false,
      usedAt: null,
    };
  }

  async findMyUsages(userId: string | undefined) {
    if (!userId) {
      return [];
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        vu.id,
        vu.voucher_id AS "voucherId",
        vu.user_id AS "userId",
        vu.order_id AS "orderId",
        vu.discount_applied AS "discountApplied",
        vu.used_at AS "usedAt",
        v.code AS "voucherCode",
        vt.code AS "voucherType"
      FROM voucher_service.voucher_usages vu
      JOIN voucher_service.vouchers v ON v.id = vu.voucher_id
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      WHERE vu.user_id = $1
      ORDER BY vu.used_at DESC
      `,
      [userId],
    );

    return (rows as VoucherUsageRow[]).map((row) => ({
      id: row.id,
      voucherId: row.voucherId,
      userId: row.userId,
      orderId: row.orderId,
      discountApplied: Number(row.discountApplied),
      usedAt: row.usedAt,
      voucherCode: row.voucherCode,
      voucherType: row.voucherType,
    }));
  }

  private async assertVoucherUsable(
    row: VoucherRow,
    orderAmount: number,
    userId: string | undefined,
    manager: EntityManager,
  ) {
    if (!row.isActive) {
      throw new BadRequestException('Voucher is inactive');
    }

    const now = new Date();

    if (new Date(row.startsAt) > now) {
      throw new BadRequestException('Voucher is not active yet');
    }

    if (new Date(row.expiresAt) < now) {
      throw new BadRequestException('Voucher has expired');
    }

    if (
      row.usageLimit != null &&
      Number(row.usedCount) >= Number(row.usageLimit)
    ) {
      throw new BadRequestException('Voucher usage limit reached');
    }

    if (orderAmount < Number(row.minOrderAmount)) {
      throw new BadRequestException(
        `Order amount must be at least ${Number(row.minOrderAmount)}`,
      );
    }

    if (userId) {
      const usageRows = await manager.query(
        `
        SELECT COUNT(*)::int AS total
        FROM voucher_service.voucher_usages
        WHERE voucher_id = $1 AND user_id = $2
        `,
        [row.id, userId],
      );

      if (Number(usageRows[0]?.total ?? 0) >= Number(row.userLimitPerUser)) {
        throw new BadRequestException('Voucher usage limit per user reached');
      }
    }

    return {
      discountAmount: this.calculateDiscountAmount(
        row.typeCode,
        Number(row.discountValue),
        orderAmount,
        row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
      ),
    };
  }

  private calculateDiscountAmount(
    typeCode: string,
    discountValue: number,
    orderAmount: number,
    maxDiscountAmount: number | null,
  ) {
    const normalizedType = typeCode.trim().toLowerCase();
    let discountAmount =
      normalizedType === String(VoucherDiscountType.PERCENT)
        ? (orderAmount * discountValue) / 100
        : discountValue;

    if (maxDiscountAmount != null) {
      discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }

    return Math.max(0, Math.min(orderAmount, discountAmount));
  }

  private async getVoucherTypeId(code: string) {
    const rows = await this.dataSource.query(
      `
      SELECT id
      FROM voucher_service.voucher_types
      WHERE LOWER(code) = LOWER($1)
      LIMIT 1
      `,
      [code],
    );

    if (!rows.length) {
      throw new NotFoundException(`Voucher type ${code} not found`);
    }

    return Number(rows[0].id);
  }

  private async getVoucherTypeCode(typeId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT code
      FROM voucher_service.voucher_types
      WHERE id = $1
      LIMIT 1
      `,
      [typeId],
    );

    if (!rows.length) {
      throw new NotFoundException(`Voucher type ${typeId} not found`);
    }

    return String(rows[0].code).toLowerCase();
  }

  private async getVoucherRowById(id: string) {
    const rows = await this.dataSource.query(
      `
      SELECT
        v.id,
        v.code,
        v.type_id AS "typeId",
        vt.code AS "typeCode",
        vt.label AS "typeLabel",
        v.discount_value AS "discountValue",
        v.max_discount_amount AS "maxDiscountAmount",
        v.min_order_amount AS "minOrderAmount",
        v.usage_limit AS "usageLimit",
        v.used_count AS "usedCount",
        v.user_limit_per_user AS "userLimitPerUser",
        v.starts_at AS "startsAt",
        v.expires_at AS "expiresAt",
        v.is_active AS "isActive",
        v.created_by AS "createdBy",
        v.created_at AS "createdAt"
      FROM voucher_service.vouchers v
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      WHERE v.id = $1
      LIMIT 1
      `,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Voucher not found');
    }

    return rows[0] as VoucherRow;
  }

  private async getVoucherRowByCode(
    code: string,
    manager: EntityManager = this.dataSource.manager,
    forUpdate = false,
  ) {
    const query = `
      SELECT
        v.id,
        v.code,
        v.type_id AS "typeId",
        vt.code AS "typeCode",
        vt.label AS "typeLabel",
        v.discount_value AS "discountValue",
        v.max_discount_amount AS "maxDiscountAmount",
        v.min_order_amount AS "minOrderAmount",
        v.usage_limit AS "usageLimit",
        v.used_count AS "usedCount",
        v.user_limit_per_user AS "userLimitPerUser",
        v.starts_at AS "startsAt",
        v.expires_at AS "expiresAt",
        v.is_active AS "isActive",
        v.created_by AS "createdBy",
        v.created_at AS "createdAt"
      FROM voucher_service.vouchers v
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      WHERE UPPER(v.code) = UPPER($1)
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `;
    const rows = await manager.query(query, [code]);

    if (!rows.length) {
      throw new NotFoundException('Voucher not found');
    }

    return rows[0] as VoucherRow;
  }

  private toVoucherResponse(row: VoucherRow) {
    const typeCode = row.typeCode.trim().toLowerCase();
    const discountValue = Number(row.discountValue);
    const maxDiscount =
      row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null;
    const usageLimit = row.usageLimit != null ? Number(row.usageLimit) : null;
    const usedCount = Number(row.usedCount ?? 0);

    return {
      id: row.id,
      code: row.code,
      name: row.code,
      description: this.buildVoucherDescription(
        typeCode,
        discountValue,
        Number(row.minOrderAmount),
        maxDiscount,
      ),
      discountType: typeCode,
      discountValue,
      minOrderValue: Number(row.minOrderAmount),
      maxDiscount,
      usageLimit,
      usedCount,
      userLimitPerUser: Number(row.userLimitPerUser),
      startDate: row.startsAt,
      endDate: row.expiresAt,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
      status: this.getVoucherStatus(row),
      remainingUsage:
        usageLimit == null ? null : Math.max(0, usageLimit - usedCount),
      typeLabel: row.typeLabel,
    };
  }

  private buildVoucherDescription(
    typeCode: string,
    discountValue: number,
    minOrderAmount: number,
    maxDiscount: number | null,
  ) {
    const value =
      typeCode === String(VoucherDiscountType.PERCENT)
        ? `${discountValue}%`
        : `${discountValue.toLocaleString('vi-VN')} VND`;
    const minOrder =
      minOrderAmount > 0
        ? ` cho don tu ${minOrderAmount.toLocaleString('vi-VN')} VND`
        : '';
    const capped =
      maxDiscount != null
        ? `, toi da ${maxDiscount.toLocaleString('vi-VN')} VND`
        : '';

    return `Giam ${value}${minOrder}${capped}`;
  }

  private getVoucherStatus(row: VoucherRow) {
    const now = new Date();

    if (!row.isActive) {
      return 'inactive';
    }

    if (new Date(row.expiresAt) < now) {
      return 'expired';
    }

    if (
      row.usageLimit != null &&
      Number(row.usedCount) >= Number(row.usageLimit)
    ) {
      return 'used_up';
    }

    if (new Date(row.startsAt) > now) {
      return 'scheduled';
    }

    return 'active';
  }

  private validateDateRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid voucher date range');
    }

    if (start >= end) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }
  }

  private validateDiscountPayload(
    discountType: string,
    discountValue: number,
    maxDiscount: number | null | undefined,
  ) {
    if (
      discountType === String(VoucherDiscountType.PERCENT) &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      throw new BadRequestException(
        'Percentage voucher discountValue must be between 0 and 100',
      );
    }

    if (maxDiscount != null && maxDiscount < 0) {
      throw new BadRequestException(
        'maxDiscount must be greater than or equal to 0',
      );
    }
  }
}
