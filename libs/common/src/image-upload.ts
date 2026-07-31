import { BadRequestException } from '@nestjs/common';

const IMAGE_SIGNATURES: Array<{
  mimeType: string;
  matches: (buffer: Buffer) => boolean;
}> = [
  {
    mimeType: 'image/jpeg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: 'image/webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP',
  },
];

export const ALLOWED_IMAGE_MIME_TYPES = IMAGE_SIGNATURES.map(
  ({ mimeType }) => mimeType,
);

export function validateUploadedImage(
  file: Express.Multer.File | undefined,
  options: { maxBytes?: number; fieldName?: string } = {},
): Express.Multer.File {
  const fieldName = options.fieldName || 'ảnh';
  if (!file?.buffer?.length) {
    throw new BadRequestException(`Thiếu ${fieldName}.`);
  }

  const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
  if (file.buffer.length > maxBytes) {
    throw new BadRequestException(
      `${fieldName} vượt quá dung lượng ${Math.floor(maxBytes / 1024 / 1024)} MB.`,
    );
  }

  const detected = IMAGE_SIGNATURES.find(({ matches }) => matches(file.buffer));
  if (!detected || detected.mimeType !== file.mimetype.toLowerCase()) {
    throw new BadRequestException(
      `${fieldName} không phải tệp JPG, PNG hoặc WebP hợp lệ.`,
    );
  }

  return file;
}

export function validateUploadedImages(
  files: Express.Multer.File[],
  options: { maxBytes?: number; fieldName?: string } = {},
): Express.Multer.File[] {
  return files.map((file) => validateUploadedImage(file, options));
}
