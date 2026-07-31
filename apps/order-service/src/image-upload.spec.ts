/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException } from '@nestjs/common';
import { validateUploadedImage } from '@app/common';
import { OrderServiceService } from './order-service.service';

function createFile(buffer: Buffer, mimetype: string): Express.Multer.File {
  return {
    buffer,
    mimetype,
    fieldname: 'image',
    originalname: 'test-image',
    encoding: '7bit',
    size: buffer.length,
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('validateUploadedImage', () => {
  it('accepts an image when MIME and binary signature match', () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);

    expect(validateUploadedImage(createFile(png, 'image/png'))).toBeDefined();
  });

  it('rejects a spoofed MIME type', () => {
    const executableText = Buffer.from('not-an-image');

    expect(() =>
      validateUploadedImage(createFile(executableText, 'image/png')),
    ).toThrow(BadRequestException);
  });
});

describe('manual refund evidence', () => {
  it('rejects completion when no receipt image is supplied', async () => {
    const service = new OrderServiceService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.completeManualReturnRefund(
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
        {
          amount: 100000,
          transactionReference: 'REF-001',
        },
        [],
      ),
    ).rejects.toThrow('Phải tải lên ít nhất một ảnh biên lai hoàn tiền.');
  });
});
