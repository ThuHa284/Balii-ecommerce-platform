import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { loadEnv } from '@app/common';
import { PaymentServiceController } from './payment-service.controller';
import { PaymentServiceService } from './payment-service.service';
import { Payment } from './entities/payment.entity';
import { OrderClientService } from './clients/order-client.service';
import { CamundaClientService } from './camunda/camunda-client.service';
import { PaymentProcessingWorker } from './camunda/payment-processing.worker';
import { PaymentOutboxPublisher } from './kafka';
import { PaymentWebhookSecurityService } from './payment-webhook-security.service';
import { RefundWorkflowService } from './refund-workflow.service';
import { RefundOperationsService } from './refund-operations.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';

loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
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
  providers: [
    PaymentServiceService,
    OrderClientService,
    CamundaClientService,
    PaymentProcessingWorker,
    PaymentOutboxPublisher,
    PaymentWebhookSecurityService,
    RefundWorkflowService,
    RefundOperationsService,
    PaymentReconciliationService,
  ],
})
export class PaymentServiceModule {}
