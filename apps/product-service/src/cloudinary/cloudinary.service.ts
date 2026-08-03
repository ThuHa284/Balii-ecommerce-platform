/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as Cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: typeof Cloudinary,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    options: { maxBytes?: number; fieldName?: string } = {},
  ): Promise<UploadApiResponse> {
    this.validateImageFile(file, options);

    return new Promise((resolve, reject) => {
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
  }

  async uploadProductImage(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse> {
    const folder = process.env.CLOUDINARY_PRODUCT_FOLDER || 'balii/products';
    return this.uploadImage(file, folder);
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
  }

  private validateImageFile(
    file: Express.Multer.File | undefined,
    options: { maxBytes?: number; fieldName?: string },
  ) {
    const fieldName = options.fieldName ?? 'ảnh tải lên';
    const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;

    if (!file?.buffer?.length) {
      throw new BadRequestException(`Vui lòng chọn ${fieldName}.`);
    }

    if (!this.allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        `${fieldName} chỉ hỗ trợ JPG, PNG hoặc WebP.`,
      );
    }

    if (file.size > maxBytes) {
      throw new BadRequestException(
        `${fieldName} quá lớn. Dung lượng tối đa là ${Math.floor(
          maxBytes / 1024 / 1024,
        )} MB.`,
      );
    }
  }
}
