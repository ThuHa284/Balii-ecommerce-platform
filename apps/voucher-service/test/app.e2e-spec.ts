import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { VoucherServiceController } from './../src/voucher-service.controller';
import { VoucherServiceService } from './../src/voucher-service.service';

describe('VoucherServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VoucherServiceController],
      providers: [
        {
          provide: VoucherServiceService,
          useValue: {
            findAvailable: () => [],
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/vouchers (GET)', () => {
    return request(app.getHttpServer()).get('/vouchers').expect(200, []);
  });
});
