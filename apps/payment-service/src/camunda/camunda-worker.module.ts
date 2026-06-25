import { Module } from '@nestjs/common';
import { CamundaClientService } from './camunda-client.service';
import { PaymentProcessingWorker } from './payment-processing.worker';

@Module({
  providers: [CamundaClientService, PaymentProcessingWorker],
  exports: [CamundaClientService],
})
export class CamundaWorkerModule {}
