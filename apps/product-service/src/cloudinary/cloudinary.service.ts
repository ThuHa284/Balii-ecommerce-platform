/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { UploadApiResponse, v2 as Cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { validateUploadedImage } from '@app/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CloudinaryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CloudinaryService.name);
  private cleanupTimer?: NodeJS.Timeout;
  private initialCleanupTimer?: NodeJS.Timeout;

  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: typeof Cloudinary,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(
      () => void this.cleanupPendingAssets(),
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
    this.initialCleanupTimer = setTimeout(
      () => void this.cleanupPendingAssets(),
      30_000,
    );
    this.initialCleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.initialCleanupTimer) clearTimeout(this.initialCleanupTimer);
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    validateUploadedImage(file, {
      maxBytes: 5 * 1024 * 1024,
      fieldName: 'ảnh tải lên',
    });
    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });

    try {
      await this.dataSource.query(
        `
        INSERT INTO product_service.media_assets (public_id, url)
        VALUES ($1, $2)
        ON CONFLICT (public_id) DO UPDATE
        SET url = EXCLUDED.url,
            status = 'pending',
            owner_type = NULL,
            owner_id = NULL,
            attached_at = NULL,
            uploaded_at = NOW(),
            updated_at = NOW()
        `,
        [uploaded.public_id, uploaded.secure_url],
      );
      return uploaded;
    } catch (error) {
      await this.cloudinary.uploader.destroy(uploaded.public_id);
      throw error;
    }
  }

  async uploadProductImage(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse> {
    const folder = process.env.CLOUDINARY_PRODUCT_FOLDER || 'balii/products';
    return this.uploadImage(file, folder);
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
    await this.dataSource.query(
      `DELETE FROM product_service.media_assets WHERE public_id = $1`,
      [publicId],
    );
  }

  async syncOwnerAssets(
    ownerType: string,
    ownerId: string,
    urls: Array<string | null | undefined>,
  ): Promise<void> {
    const activeUrls = [
      ...new Set(urls.filter((url): url is string => Boolean(url))),
    ];
    const staleAssets = await this.dataSource.transaction(async (manager) => {
      const stale: Array<{ publicId: string }> = await manager.query(
        `
        UPDATE product_service.media_assets
        SET status = 'pending_delete', updated_at = NOW()
        WHERE owner_type = $1
          AND owner_id = $2
          AND status = 'attached'
          AND NOT (url = ANY($3::text[]))
        RETURNING public_id AS "publicId"
        `,
        [ownerType, ownerId, activeUrls],
      );

      if (activeUrls.length) {
        await manager.query(
          `
          UPDATE product_service.media_assets
          SET status = 'attached',
              owner_type = $1,
              owner_id = $2,
              attached_at = NOW(),
              updated_at = NOW()
          WHERE url = ANY($3::text[])
          `,
          [ownerType, ownerId, activeUrls],
        );
      }
      return stale;
    });

    await this.deleteRegisteredAssets(
      staleAssets.map((asset) => asset.publicId),
    );
  }

  async releaseOwnerAssets(ownerType: string, ownerId: string): Promise<void> {
    const assets: Array<{ publicId: string }> = await this.dataSource.query(
      `
      UPDATE product_service.media_assets
      SET status = 'pending_delete', updated_at = NOW()
      WHERE owner_type = $1 AND owner_id = $2
      RETURNING public_id AS "publicId"
      `,
      [ownerType, ownerId],
    );
    await this.deleteRegisteredAssets(assets.map((asset) => asset.publicId));
  }

  private async cleanupPendingAssets(): Promise<void> {
    const ttlHours = this.getPendingTtlHours();
    try {
      await this.dataSource.query(`
        WITH referenced AS (
          SELECT asset.id, 'campaign'::varchar AS owner_type, campaign.id AS owner_id
          FROM product_service.media_assets asset
          JOIN product_service.campaigns campaign
            ON asset.url IN (campaign.image_url, campaign.banner_image_url)
          WHERE asset.status = 'pending'
          UNION ALL
          SELECT asset.id, 'collection'::varchar, collection.id
          FROM product_service.media_assets asset
          JOIN product_service.collections collection
            ON asset.url IN (collection.image_url, collection.banner_image_url)
          WHERE asset.status = 'pending'
          UNION ALL
          SELECT asset.id, 'product_image'::varchar, image.id
          FROM product_service.media_assets asset
          JOIN product_service.product_images image ON image.url = asset.url
          WHERE asset.status = 'pending'
        )
        UPDATE product_service.media_assets asset
        SET status = 'attached',
            owner_type = referenced.owner_type,
            owner_id = referenced.owner_id,
            attached_at = NOW(),
            updated_at = NOW()
        FROM referenced
        WHERE asset.id = referenced.id
      `);

      const assets: Array<{ publicId: string }> = await this.dataSource.query(
        `
        WITH cleanup_lock AS (
          SELECT pg_try_advisory_xact_lock(82411975) AS acquired
        )
        UPDATE product_service.media_assets asset
        SET status = 'pending_delete', updated_at = NOW()
        FROM cleanup_lock
        WHERE cleanup_lock.acquired
          AND (
            (
              asset.status = 'pending'
              AND asset.uploaded_at < NOW() - ($1 * INTERVAL '1 hour')
            )
            OR (
              asset.status = 'pending_delete'
              AND asset.updated_at < NOW() - INTERVAL '5 minutes'
            )
            OR (
              asset.status = 'attached'
              AND asset.updated_at < NOW() - INTERVAL '1 hour'
              AND (
                (asset.owner_type = 'campaign' AND NOT EXISTS (
                  SELECT 1 FROM product_service.campaigns owner
                  WHERE owner.id = asset.owner_id
                    AND asset.url IN (owner.image_url, owner.banner_image_url)
                ))
                OR (asset.owner_type = 'collection' AND NOT EXISTS (
                  SELECT 1 FROM product_service.collections owner
                  WHERE owner.id = asset.owner_id
                    AND asset.url IN (owner.image_url, owner.banner_image_url)
                ))
                OR (asset.owner_type = 'product_image' AND NOT EXISTS (
                  SELECT 1 FROM product_service.product_images owner
                  WHERE owner.id = asset.owner_id AND owner.url = asset.url
                ))
              )
            )
          )
        RETURNING asset.public_id AS "publicId"
        `,
        [ttlHours],
      );
      await this.deleteRegisteredAssets(assets.map((asset) => asset.publicId));
    } catch (error) {
      this.logger.warn(
        `Không thể dọn media pending: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async deleteRegisteredAssets(publicIds: string[]): Promise<void> {
    for (const publicId of publicIds) {
      try {
        await this.cloudinary.uploader.destroy(publicId);
        await this.dataSource.query(
          `DELETE FROM product_service.media_assets WHERE public_id = $1`,
          [publicId],
        );
      } catch (error) {
        this.logger.warn(
          `Không thể xóa media ${publicId}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  private getPendingTtlHours(): number {
    const configured = Number(process.env.MEDIA_PENDING_TTL_HOURS);
    return Number.isInteger(configured) && configured >= 1 && configured <= 720
      ? configured
      : 24;
  }
}
