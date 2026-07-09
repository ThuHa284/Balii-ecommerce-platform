import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  hasConfiguration(): boolean {
    return Boolean(
      this.configService.get('CLOUDINARY_CLOUD_NAME') &&
      this.configService.get('CLOUDINARY_API_KEY') &&
      this.configService.get('CLOUDINARY_API_SECRET'),
    );
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    publicId?: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.hasConfiguration()) {
      throw new InternalServerErrorException(
        'Cloudinary configuration is missing. Cannot upload image.',
      );
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(
              new ServiceUnavailableException(
                'Cloudinary upload failed. Please try again later.',
              ),
            );
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      stream.end(buffer);
    });
  }
}
