import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderServiceController } from './../src/order-service.controller';
import { OrderServiceService } from './../src/order-service.service';

describe('OrderServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrderServiceController],
      providers: [
        {
          provide: OrderServiceService,
          useValue: {
            findMyOrders: () => [],
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/orders (GET)', () => {
    return request(app.getHttpServer()).get('/orders').expect(200, []);
  });
});
