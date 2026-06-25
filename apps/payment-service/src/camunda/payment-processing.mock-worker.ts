/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Variables } from 'camunda-external-task-client-js';
import { CamundaWorkerService } from './camunda-worker.service';

@Injectable()
export class PaymentProcessingMockWorker implements OnModuleInit {
  constructor(private readonly camundaWorker: CamundaWorkerService) {}

  onModuleInit() {
    const client = this.camundaWorker.getClient();

    client.subscribe(
      'payment.validate-request',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.validate-request');

        const variables = new Variables();
        variables.set('paymentRequestValid', true);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.check-idempotency',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.check-idempotency');

        const variables = new Variables();
        variables.set('paymentAlreadyExists', false);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.create-or-reuse',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.create-or-reuse');

        const orderId = task.variables.get('orderId');

        const variables = new Variables();
        variables.set('paymentId', `pay_mock_${Date.now()}`);
        variables.set('merchantTxnId', `BALII_${orderId}_${Date.now()}`);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.generate-provider-url',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.generate-provider-url');

        const paymentId = task.variables.get('paymentId');

        const variables = new Variables();
        variables.set(
          'paymentUrl',
          `https://sandbox-payment.local/pay/${paymentId}`,
        );
        variables.set('providerRef', `PROVIDER_REF_${Date.now()}`);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.verify-signature',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.verify-signature');

        const variables = new Variables();
        variables.set('signatureValid', true);
        variables.set('providerTxnId', `TXN_${Date.now()}`);
        variables.set('gatewayAmount', 399000);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.check-duplicate-callback',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.check-duplicate-callback');

        const variables = new Variables();
        variables.set('duplicateCallback', false);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.persist-result-transaction',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.persist-result-transaction');

        const variables = new Variables();

        /**
         * Gateway của BPMN đang đọc biến paymentResult.
         * Có thể đổi SUCCESS / FAILED / CANCELLED / UNKNOWN / AMOUNT_MISMATCH để test các nhánh.
         */
        variables.set('paymentResult', 'SUCCESS');
        variables.set('outboxEventId', `outbox_${Date.now()}`);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'outbox.signal-publisher',
      async ({ task, taskService }) => {
        console.log('[Camunda] outbox.signal-publisher');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'workflow.correlate-payment-success',
      async ({ task, taskService }) => {
        console.log('[Camunda] workflow.correlate-payment-success');

        await taskService.complete(task);
      },
    );

    client.subscribe('order.cancel-release', async ({ task, taskService }) => {
      console.log('[Camunda] order.cancel-release');

      await taskService.complete(task);
    });

    client.subscribe(
      'payment.save-invalid-webhook',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.save-invalid-webhook');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'payment.mark-review-required',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.mark-review-required');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'payment.mark-expired-transaction',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.mark-expired-transaction');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'payment.find-pending-for-reconciliation',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.find-pending-for-reconciliation');

        const variables = new Variables();
        variables.set('hasPendingPayments', false);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.query-gateway-status',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.query-gateway-status');

        const variables = new Variables();
        variables.set('gatewayResult', 'UNKNOWN');
        variables.set('tooManyAttempts', false);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.persist-reconciled-success',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.persist-reconciled-success');

        const variables = new Variables();
        variables.set('paymentFinalStatus', 'paid');
        variables.set('outboxEventId', `outbox_${Date.now()}`);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.persist-reconciled-failed',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.persist-reconciled-failed');

        const variables = new Variables();
        variables.set('paymentFinalStatus', 'failed');
        variables.set('outboxEventId', `outbox_${Date.now()}`);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'payment.increase-reconciliation-attempt',
      async ({ task, taskService }) => {
        console.log('[Camunda] payment.increase-reconciliation-attempt');

        const variables = new Variables();
        variables.set('reconciliationAttempt', 1);
        variables.set('tooManyAttempts', false);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.validate-request',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.validate-request');

        const variables = new Variables();
        variables.set('orderId', task.variables.get('orderId') || `order_${Date.now()}`);
        variables.set('userId', task.variables.get('userId') || `user_${Date.now()}`);
        variables.set('method', 'vnpay');

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.check-payment-status',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.check-payment-status');

        const variables = new Variables();
        variables.set('refundAllowed', true);
        variables.set('paymentStatus', 'paid');
        variables.set('refundableAmount', 399000);
        variables.set('refundValidationReason', null);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.check-order-fulfillment-status',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.check-order-fulfillment-status');

        const variables = new Variables();
        variables.set('orderStatus', 'pending');
        variables.set('refundRoute', 'AUTO_REFUND');
        variables.set('refundRouteReason', null);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.validate-condition',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.validate-condition');

        const variables = new Variables();
        variables.set('refundAllowed', true);
        variables.set('refundableAmount', 399000);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.check-idempotency',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.check-idempotency');

        const variables = new Variables();
        variables.set('refundAlreadyExists', false);
        variables.set(
          'effectiveRefundAmount',
          task.variables.get('approvedRefundAmount') ??
            task.variables.get('amount') ??
            399000,
        );

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.create-record',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.create-record');

        const variables = new Variables();
        variables.set('refundId', `refund_mock_${Date.now()}`);
        variables.set('providerRefundId', `provider_refund_${Date.now()}`);
        variables.set(
          'effectiveRefundAmount',
          task.variables.get('approvedRefundAmount') ??
            task.variables.get('amount') ??
            399000,
        );

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.call-gateway-api',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.call-gateway-api');

        const variables = new Variables();
        variables.set('refundRequestAccepted', true);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.persist-result-transaction',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.persist-result-transaction');

        const variables = new Variables();
        variables.set('refundStatus', 'SUCCESS');
        variables.set('outboxEventId', `outbox_${Date.now()}`);
        variables.set('fullyRefunded', true);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.increase-retry-count',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.increase-retry-count');

        const variables = new Variables();
        variables.set('refundRetryCount', 1);
        variables.set('refundRetryAllowed', true);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.update-rejected',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.update-rejected');

        const variables = new Variables();
        variables.set('refundId', task.variables.get('refundId') || `refund_rejected_${Date.now()}`);
        variables.set(
          'rejectionReason',
          task.variables.get('refundRouteReason') ||
            task.variables.get('refundValidationReason') ||
            'Refund request rejected',
        );

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.create-exchange-request',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.create-exchange-request');

        const variables = new Variables();
        variables.set('exchangeRequestId', `exchange_${Date.now()}`);

        await taskService.complete(task, variables);
      },
    );

    client.subscribe(
      'refund.update-order-inventory-exchange',
      async ({ task, taskService }) => {
        console.log('[Camunda] refund.update-order-inventory-exchange');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'notification.refund-completed',
      async ({ task, taskService }) => {
        console.log('[Camunda] notification.refund-completed');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'notification.refund-rejected',
      async ({ task, taskService }) => {
        console.log('[Camunda] notification.refund-rejected');

        await taskService.complete(task);
      },
    );

    client.subscribe(
      'notification.exchange-created',
      async ({ task, taskService }) => {
        console.log('[Camunda] notification.exchange-created');

        await taskService.complete(task);
      },
    );

    console.log('[CamundaWorker] Payment processing mock worker subscribed');
  }
}
