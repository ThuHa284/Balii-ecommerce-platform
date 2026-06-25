/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, logger } from 'camunda-external-task-client-js';

@Injectable()
export class CamundaWorkerService implements OnModuleInit {
  private client: Client;

  onModuleInit() {
    this.client = new Client({
      baseUrl:
        process.env.CAMUNDA_BASE_URL || 'http://localhost:8080/engine-rest',
      use: logger,
      asyncResponseTimeout: 10000,
      maxTasks: 5,
    });

    console.log('[CamundaWorker] Connected to Camunda External Task API');
  }

  getClient(): Client {
    return this.client;
  }
}
