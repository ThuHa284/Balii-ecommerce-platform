/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, logger } from 'camunda-external-task-client-js';

@Injectable()
export class CamundaClientService implements OnModuleInit {
  private client: Client;
  private readonly baseUrl =
    process.env.CAMUNDA_BASE_URL || 'http://localhost:8080/engine-rest';

  onModuleInit() {
    if (process.env.DISABLE_CAMUNDA_WORKER === 'true') {
      console.log('[Camunda] External Task Client disabled by configuration');
      return;
    }

    this.client = new Client({
      baseUrl: this.baseUrl,
      use: logger,
      asyncResponseTimeout: 10000,
      maxTasks: 5,
    });

    console.log('[Camunda] External Task Client connected');
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Camunda client is not initialized');
    }

    return this.client;
  }

  async startPaymentProcessing(input: {
    orderId: string;
    userId: string;
    amount: number;
    method: string;
    idempotencyKey?: string;
  }) {
    const response = await fetch(
      `${this.baseUrl}/process-definition/key/Process_Payment_Processing/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessKey: input.orderId,
          variables: {
            orderId: {
              value: input.orderId,
              type: 'String',
            },
            userId: {
              value: input.userId,
              type: 'String',
            },
            amount: {
              value: Number(input.amount),
              type: 'Double',
            },
            method: {
              value: input.method,
              type: 'String',
            },
            idempotencyKey: {
              value:
                input.idempotencyKey ||
                `checkout_${input.orderId}_${input.method}`,
              type: 'String',
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to start payment workflow: ${errorBody}`);
    }

    return response.json();
  }

  async correlatePaymentCallback(input: {
    orderId: string;
    provider: string;
    rawPayload: unknown;
    signature?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageName: 'payment.callback.received',
        businessKey: input.orderId,
        processVariables: {
          provider: {
            value: input.provider,
            type: 'String',
          },
          rawPayload: {
            value: JSON.stringify(input.rawPayload || {}),
            type: 'String',
          },
          signature: {
            value: input.signature || '',
            type: 'String',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to correlate payment callback: ${errorBody}`);
    }

    return {
      correlated: true,
    };
  }

  async startRefundWorkflow(input: {
    paymentId: string;
    orderId?: string;
    userId?: string;
    amount: number;
    reason: string;
    idempotencyKey?: string;
  }) {
    const response = await fetch(
      `${this.baseUrl}/process-definition/key/Process_Refund_Workflow/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessKey: input.paymentId,
          variables: {
            paymentId: {
              value: input.paymentId,
              type: 'String',
            },
            orderId: {
              value: input.orderId || '',
              type: 'String',
            },
            userId: {
              value: input.userId || '',
              type: 'String',
            },
            amount: {
              value: Number(input.amount),
              type: 'Double',
            },
            reason: {
              value: input.reason,
              type: 'String',
            },
            idempotencyKey: {
              value:
                input.idempotencyKey ||
                `refund_${input.paymentId}_${Number(input.amount)}`,
              type: 'String',
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to start refund workflow: ${errorBody}`);
    }

    return response.json();
  }

  async correlateRefundResult(input: {
    paymentId: string;
    provider: string;
    rawPayload: unknown;
    refundId?: string;
    refundResult?: string;
    providerRefundId?: string;
    signature?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageName: 'refund.result.received',
        businessKey: input.paymentId,
        processVariables: {
          provider: {
            value: input.provider,
            type: 'String',
          },
          refundId: {
            value: input.refundId || '',
            type: 'String',
          },
          providerRefundId: {
            value: input.providerRefundId || '',
            type: 'String',
          },
          refundResult: {
            value: input.refundResult || 'FAILED',
            type: 'String',
          },
          rawPayload: {
            value: JSON.stringify(input.rawPayload || {}),
            type: 'String',
          },
          signature: {
            value: input.signature || '',
            type: 'String',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to correlate refund result: ${errorBody}`);
    }

    return {
      correlated: true,
    };
  }
}
