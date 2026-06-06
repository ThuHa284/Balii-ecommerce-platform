import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PaymentServiceController } from './../src/payment-service.controller';
import { PaymentServiceService } from './../src/payment-service.service';

describe('PaymentServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentServiceController],
      providers: [
        {
          provide: PaymentServiceService,
          useValue: {
            findMyPayments: () => [],
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/payments (GET)', () => {
    return request(app.getHttpServer())
      .get('/payments')
      .expect(200, []);
  });
});
