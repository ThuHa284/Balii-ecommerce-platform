import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentServiceController } from './payment-service.controller';
import { PaymentServiceService } from './payment-service.service';
import { Payment } from './entities/payment.entity';
import { OrderClientService } from './clients/order-client.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5433),
      username: process.env.DB_USERNAME || 'balii_admin',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_DATABASE || 'balii_sleepwear',
      schema: 'payment_service',
      autoLoadEntities: true,
      synchronize: false,
    }),
    TypeOrmModule.forFeature([Payment]),
    HttpModule,
  ],
  controllers: [PaymentServiceController],
  providers: [PaymentServiceService, OrderClientService],
})
export class PaymentServiceModule {}
