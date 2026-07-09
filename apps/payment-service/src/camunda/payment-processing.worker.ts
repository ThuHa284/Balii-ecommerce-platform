/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Variables } from 'camunda-external-task-client-js';
import { CamundaClientService } from './camunda-client.service';
import { PaymentServiceService } from '../payment-service.service';

@Injectable()
export class PaymentProcessingWorker implements OnModuleInit {
  constructor(
    private readonly camundaClient: CamundaClientService,
    private readonly paymentService: PaymentServiceService,
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_CAMUNDA_WORKER === 'true') {
      console.log('[Camunda] Payment worker disabled by configuration');
      return;
    }

    // Worker này là lớp map giữa BPMN topic và application service.
    // Mỗi topic nên chỉ làm một việc nhỏ để workflow dễ retry/rẽ nhánh.
    const client = this.camundaClient.getClient();

    client.subscribe(
      'payment.validate-request',
      async ({ task, taskService }) => {
        try {
          const orderId = task.variables.get('orderId');
          const userId = task.variables.get('userId');
          const amount = task.variables.get('amount');
          const method = task.variables.get('method');

          await this.paymentService.validatePaymentRequest({
            orderId,
            userId,
            amount,
            method,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.check-idempotency',
      async ({ task, taskService }) => {
        try {
          const orderId = task.variables.get('orderId');
          const idempotencyKey = task.variables.get('idempotencyKey');

          const result = await this.paymentService.checkIdempotency({
            orderId,
            idempotencyKey,
          });

          const variables = new Variables();
          variables.set('paymentAlreadyExists', result.exists);
          variables.set('paymentId', result.paymentId || null);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.create-or-reuse',
      async ({ task, taskService }) => {
        try {
          const orderId = task.variables.get('orderId');
          const userId = task.variables.get('userId');
          const amount = task.variables.get('amount');
          const method = task.variables.get('method');
          const idempotencyKey = task.variables.get('idempotencyKey');

          const payment = await this.paymentService.createOrReusePayment({
            orderId,
            userId,
            amount,
            method,
            idempotencyKey,
          });

          const variables = new Variables();
          variables.set('paymentId', payment.id);
          variables.set('merchantTxnId', payment.merchantTxnId);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.generate-provider-url',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const method = task.variables.get('method');

          const result = await this.paymentService.generateProviderPaymentUrl({
            paymentId,
            method,
          });

          const variables = new Variables();
          variables.set('paymentUrl', result.paymentUrl);
          variables.set('providerRef', result.providerRef);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.verify-signature',
      async ({ task, taskService }) => {
        try {
          const provider = task.variables.get('provider');
          const rawPayload = task.variables.get('rawPayload');
          const signature = task.variables.get('signature');

          const result = await this.paymentService.verifyGatewaySignature({
            provider,
            rawPayload,
            signature,
          });

          const variables = new Variables();
          variables.set('signatureValid', result.signatureValid);
          variables.set('providerTxnId', result.providerTxnId || null);
          variables.set('paymentResult', result.paymentResult);
          variables.set('gatewayAmount', result.gatewayAmount || null);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.check-duplicate-callback',
      async ({ task, taskService }) => {
        try {
          const rawPayload = task.variables.get('rawPayload');

          const result =
            await this.paymentService.checkDuplicateCallback(rawPayload);

          const variables = new Variables();
          variables.set('duplicateCallback', result.duplicate);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.persist-result-transaction',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');
          const rawPayload = task.variables.get('rawPayload');
          const providerTxnId = task.variables.get('providerTxnId');
          const paymentResult = task.variables.get('paymentResult');

          const result =
            await this.paymentService.persistPaymentResultTransaction({
              paymentId,
              orderId,
              rawPayload,
              providerTxnId,
              paymentResult,
            });

          const variables = new Variables();
          variables.set('paymentFinalStatus', result.paymentFinalStatus);
          variables.set('outboxEventId', result.outboxEventId);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'outbox.signal-publisher',
      async ({ task, taskService }) => {
        try {
          await this.paymentService.signalOutboxPublisher();
          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'workflow.correlate-payment-success',
      async ({ task, taskService }) => {
        try {
          const orderId = task.variables.get('orderId');
          const paymentId = task.variables.get('paymentId');

          await this.paymentService.correlatePaymentSuccessToOrder({
            orderId,
            paymentId,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe('order.cancel-release', async ({ task, taskService }) => {
      try {
        const orderId = task.variables.get('orderId');
        const paymentId = task.variables.get('paymentId');

        await this.paymentService.cancelOrReleaseOrder({
          orderId,
          paymentId,
        });

        await taskService.complete(task);
      } catch (error) {
        await this.handleFailure(task, taskService, error);
      }
    });

    client.subscribe(
      'payment.save-invalid-webhook',
      async ({ task, taskService }) => {
        try {
          const rawPayload = task.variables.get('rawPayload');

          await this.paymentService.saveInvalidWebhook(rawPayload);

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.mark-review-required',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const reason =
            task.variables.get('reviewReason') || 'Manual review required';

          await this.paymentService.markReviewRequired({
            paymentId,
            reason,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.mark-expired-transaction',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');

          await this.paymentService.markExpiredTransaction({
            paymentId,
            orderId,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.find-pending-for-reconciliation',
      async ({ task, taskService }) => {
        try {
          const result =
            await this.paymentService.findPendingPaymentsForReconciliation();

          const variables = new Variables();
          variables.set('hasPendingPayments', result.hasPendingPayments);
          variables.set('paymentId', result.paymentId || null);
          variables.set('orderId', result.orderId || null);
          variables.set('userId', result.userId || null);
          variables.set('amount', result.amount || null);
          variables.set('method', result.method || null);
          variables.set('providerRef', result.providerRef || null);
          variables.set('providerTxnId', result.providerTxnId || null);
          variables.set(
            'reconciliationAttempt',
            result.reconciliationAttempt || 0,
          );

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.query-gateway-status',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const providerRef = task.variables.get('providerRef');
          const providerTxnId = task.variables.get('providerTxnId');

          const result = await this.paymentService.queryGatewayStatus({
            paymentId,
            providerRef,
            providerTxnId,
          });

          const variables = new Variables();
          variables.set('gatewayResult', result.gatewayResult);
          variables.set('providerTxnId', result.providerTxnId);
          variables.set('tooManyAttempts', result.tooManyAttempts);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.persist-reconciled-success',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');
          const providerTxnId = task.variables.get('providerTxnId');

          const result = await this.paymentService.persistReconciledSuccess({
            paymentId,
            orderId,
            providerTxnId,
          });

          const variables = new Variables();
          variables.set('paymentFinalStatus', result.paymentFinalStatus);
          variables.set('outboxEventId', result.outboxEventId || null);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.persist-reconciled-failed',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');
          const gatewayResult = task.variables.get('gatewayResult');
          const providerTxnId = task.variables.get('providerTxnId');

          const result = await this.paymentService.persistReconciledFailed({
            paymentId,
            orderId,
            gatewayResult,
            providerTxnId,
          });
          const normalizedFinalStatus =
            'paymentFinalStatus' in result
              ? result.paymentFinalStatus
              : gatewayResult;

          const variables = new Variables();
          variables.set('paymentFinalStatus', normalizedFinalStatus);
          variables.set('outboxEventId', result.outboxEventId || null);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'payment.increase-reconciliation-attempt',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const result =
            await this.paymentService.increaseReconciliationAttempt({
              paymentId,
            });

          const variables = new Variables();
          variables.set('reconciliationAttempt', result.reconciliationAttempt);
          variables.set('tooManyAttempts', result.tooManyAttempts);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.validate-request',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const amount = task.variables.get('amount');
          const reason = task.variables.get('reason');

          const result = await this.paymentService.validateRefundRequest({
            paymentId,
            amount: Number(amount),
            reason,
          });

          const variables = new Variables();
          variables.set('paymentId', result.paymentId);
          variables.set('orderId', result.orderId);
          variables.set('userId', result.userId);
          variables.set('method', result.method);
          variables.set('amount', result.amount);
          variables.set('reason', result.reason);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.check-payment-status',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const amount = task.variables.get('amount');
          const reason = task.variables.get('reason');

          const result = await this.paymentService.checkRefundPaymentStatus({
            paymentId,
            amount: Number(amount),
            reason,
          });

          const variables = new Variables();
          variables.set('refundAllowed', result.refundAllowed);
          variables.set('orderId', result.orderId);
          variables.set('userId', result.userId);
          variables.set('method', result.method);
          variables.set('paymentStatus', result.paymentStatus);
          variables.set('refundValidationReason', result.reason);
          variables.set('refundableAmount', result.refundableAmount);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.check-order-fulfillment-status',
      async ({ task, taskService }) => {
        try {
          const orderId = task.variables.get('orderId');
          const userId = task.variables.get('userId');
          const paymentStatus = task.variables.get('paymentStatus');
          const refundAllowed = task.variables.get('refundAllowed');
          const amount = task.variables.get('amount');
          const refundableAmount = task.variables.get('refundableAmount');

          const result =
            await this.paymentService.checkRefundOrderFulfillmentStatus({
              orderId,
              userId,
              paymentStatus,
              refundAllowed: Boolean(refundAllowed),
              amount: Number(amount),
              refundableAmount: Number(refundableAmount),
            });

          const variables = new Variables();
          variables.set('refundRoute', result.refundRoute);
          variables.set('orderStatus', result.orderStatus);
          variables.set('refundRouteReason', result.routeReason);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.validate-condition',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const amount = task.variables.get('amount');
          const reason = task.variables.get('reason');

          const result = await this.paymentService.validateRefundCondition({
            paymentId,
            amount: Number(amount),
            reason,
          });

          const variables = new Variables();
          variables.set('refundAllowed', result.refundAllowed);
          variables.set('orderId', result.orderId);
          variables.set('userId', result.userId);
          variables.set('method', result.method);
          variables.set('refundValidationReason', result.reason);
          variables.set('refundableAmount', result.refundableAmount);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.check-idempotency',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const approvedRefundAmount = task.variables.get(
            'approvedRefundAmount',
          );
          const amount =
            approvedRefundAmount != null
              ? approvedRefundAmount
              : task.variables.get('amount');
          const idempotencyKey = task.variables.get('idempotencyKey');

          const result = await this.paymentService.checkRefundIdempotency({
            paymentId,
            amount: Number(amount),
            idempotencyKey,
          });

          const variables = new Variables();
          variables.set('refundAlreadyExists', result.exists);
          variables.set('refundId', result.refundId || null);
          variables.set('providerRefundId', result.providerRefundId || null);
          variables.set('effectiveRefundAmount', Number(amount));

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe('refund.create-record', async ({ task, taskService }) => {
      try {
        const paymentId = task.variables.get('paymentId');
        const approvedRefundAmount = task.variables.get('approvedRefundAmount');
        const amount =
          approvedRefundAmount != null
            ? approvedRefundAmount
            : (task.variables.get('effectiveRefundAmount') ??
              task.variables.get('amount'));
        const reason = task.variables.get('reason');
        const idempotencyKey = task.variables.get('idempotencyKey');

        const result = await this.paymentService.createRefundRecord({
          paymentId,
          amount: Number(amount),
          reason,
          idempotencyKey,
        });

        const variables = new Variables();
        variables.set('refundId', result.refundId);
        variables.set('providerRefundId', result.providerRefundId || null);
        variables.set('effectiveRefundAmount', Number(amount));

        await taskService.complete(task, variables);
      } catch (error) {
        await this.handleFailure(task, taskService, error);
      }
    });

    client.subscribe(
      'refund.call-gateway-api',
      async ({ task, taskService }) => {
        try {
          const refundId = task.variables.get('refundId');
          const paymentId = task.variables.get('paymentId');
          const method = task.variables.get('method');
          const providerRefundId = task.variables.get('providerRefundId');

          const result = await this.paymentService.callGatewayRefundApi({
            refundId,
            paymentId,
            method,
            providerRefundId,
          });

          const variables = new Variables();
          variables.set('providerRefundId', result.providerRefundId);
          variables.set('refundRequestAccepted', result.accepted);
          variables.set('gatewayMode', result.gatewayMode);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.persist-result-transaction',
      async ({ task, taskService }) => {
        try {
          const refundId = task.variables.get('refundId');
          const paymentId = task.variables.get('paymentId');
          const rawPayload = task.variables.get('rawPayload');
          const providerRefundId = task.variables.get('providerRefundId');
          const refundResult = task.variables.get('refundResult') || 'FAILED';

          const result =
            await this.paymentService.persistRefundResultTransaction({
              refundId,
              paymentId,
              rawPayload,
              providerRefundId,
              refundResult,
            });

          const variables = new Variables();
          variables.set('refundStatus', result.refundStatus);
          variables.set('outboxEventId', result.outboxEventId || null);
          variables.set('fullyRefunded', result.fullyRefunded);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.increase-retry-count',
      async ({ task, taskService }) => {
        try {
          const refundId = task.variables.get('refundId');
          const result = await this.paymentService.increaseRefundRetryCount({
            refundId,
          });

          const variables = new Variables();
          variables.set('refundRetryCount', result.retryCount);
          variables.set('refundRetryAllowed', result.refundRetryAllowed);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.update-rejected',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const refundId = task.variables.get('refundId');
          const amount =
            task.variables.get('effectiveRefundAmount') ??
            task.variables.get('approvedRefundAmount') ??
            task.variables.get('amount');
          const reason = task.variables.get('reason');
          const idempotencyKey = task.variables.get('idempotencyKey');
          const adminNote = task.variables.get('adminNote');
          const rejectionReason =
            task.variables.get('refundRouteReason') ||
            task.variables.get('refundValidationReason') ||
            adminNote;

          const result = await this.paymentService.updateRefundRejected({
            paymentId,
            refundId,
            amount: Number(amount),
            reason,
            idempotencyKey,
            adminNote,
            rejectionReason,
          });

          const variables = new Variables();
          variables.set('refundId', result.refundId);
          variables.set('rejectionReason', result.rejectionReason);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.create-exchange-request',
      async ({ task, taskService }) => {
        try {
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');
          const userId = task.variables.get('userId');
          const amount = task.variables.get('amount');
          const reason = task.variables.get('reason');
          const approvedRefundAmount = task.variables.get(
            'approvedRefundAmount',
          );
          const adminNote = task.variables.get('adminNote');

          const result = await this.paymentService.createExchangeRequest({
            paymentId,
            orderId,
            userId,
            amount: Number(amount),
            reason,
            approvedRefundAmount:
              approvedRefundAmount != null
                ? Number(approvedRefundAmount)
                : undefined,
            adminNote,
          });

          const variables = new Variables();
          variables.set('exchangeRequestId', result.exchangeRequestId);

          await taskService.complete(task, variables);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'refund.update-order-inventory-exchange',
      async ({ task, taskService }) => {
        try {
          const orderId = task.variables.get('orderId');
          const paymentId = task.variables.get('paymentId');
          const userId = task.variables.get('userId');
          const exchangeRequestId = task.variables.get('exchangeRequestId');

          await this.paymentService.updateOrderInventoryForExchange({
            orderId,
            paymentId,
            userId,
            exchangeRequestId,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'notification.refund-completed',
      async ({ task, taskService }) => {
        try {
          const refundId = task.variables.get('refundId');

          await this.paymentService.notifyCustomerRefundCompleted({
            refundId,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'notification.refund-rejected',
      async ({ task, taskService }) => {
        try {
          const refundId = task.variables.get('refundId');
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');
          const userId = task.variables.get('userId');
          const rejectionReason = task.variables.get('rejectionReason');

          await this.paymentService.notifyCustomerRefundRejected({
            refundId,
            paymentId,
            orderId,
            userId,
            rejectionReason,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    client.subscribe(
      'notification.exchange-created',
      async ({ task, taskService }) => {
        try {
          const exchangeRequestId = task.variables.get('exchangeRequestId');
          const paymentId = task.variables.get('paymentId');
          const orderId = task.variables.get('orderId');
          const userId = task.variables.get('userId');

          await this.paymentService.notifyCustomerExchangeCreated({
            exchangeRequestId,
            paymentId,
            orderId,
            userId,
          });

          await taskService.complete(task);
        } catch (error) {
          await this.handleFailure(task, taskService, error);
        }
      },
    );

    console.log('[Camunda] Payment Processing Worker subscribed');
  }

  private async handleFailure(task: any, taskService: any, error: any) {
    console.error('[Camunda Worker Error]', error);

    // Retry mặc định ở mức worker để che các lỗi tạm thời; lỗi nghiệp vụ sẽ được service throw rõ ràng cho BPMN xử lý.
    await taskService.handleFailure(task, {
      errorMessage: error.message || 'Worker error',
      errorDetails: error.stack || String(error),
      retries: 3,
      retryTimeout: 10000,
    });
  }
}
