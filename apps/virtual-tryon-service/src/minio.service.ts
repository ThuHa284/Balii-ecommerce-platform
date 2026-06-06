/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

type UploadedImageFile = {
  mimetype: string;
  buffer: Buffer;
  originalname?: string;
};

@Injectable()
export class MinioService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET') || 'tryon';

    this.s3 = new S3Client({
      region: this.configService.get<string>('MINIO_REGION') || 'us-east-1',
      endpoint:
        this.configService.get<string>('MINIO_ENDPOINT') ||
        'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
      },
    });
  }

  async ensureBucket() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async uploadImage(file: UploadedImageFile) {
    await this.ensureBucket();

    const ext = file.mimetype.split('/')[1] || 'jpg';
    const key = `model-images/${uuidv4()}.${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const signedUrl = await getSignedUrl(
        this.s3,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        {
          expiresIn: 60 * 30,
        },
      );

      return {
        key,
        url: signedUrl,
      };
    } catch (error) {
      throw new InternalServerErrorException('Upload image to MinIO failed');
    }
  }

  async uploadBuffer(buffer: Buffer, mimeType: string, folder: string) {
    await this.ensureBucket();

    const ext = mimeType.split('/')[1] || 'jpg';
    const key = `${folder}/${Date.now()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return {
      key,
      url: `${this.configService.get<string>('MINIO_PUBLIC_URL')}/${this.bucket}/${key}`,
    };
  }
}
