/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, logger } from 'camunda-external-task-client-js';
import {
  CamundaActivityStatistics,
  CamundaActivitySummary,
  CamundaCountResult,
  CamundaIncidentSummary,
  CamundaProcessDefinitionSummary,
  CamundaProcessDefinitionXml,
  CamundaProcessInstanceSummary,
  CamundaVariableMap,
} from './camunda-monitor.types';

const MONITORED_PROCESS_KEYS = [
  'Process_Payment_Processing',
  'Process_Refund_Workflow',
  'Process_Payment_Reconciliation',
] as const;

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

  private async fetchCamunda<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Camunda request failed (${response.status}): ${errorBody}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async findLatestHistoricProcessInstance(input: {
    processDefinitionKey: string;
    businessKey: string;
  }): Promise<CamundaProcessInstanceSummary | null> {
    const params = new URLSearchParams({
      processDefinitionKey: input.processDefinitionKey,
      processInstanceBusinessKey: input.businessKey,
      sortBy: 'startTime',
      sortOrder: 'desc',
      maxResults: '1',
    });

    const rows = await this.fetchCamunda<CamundaProcessInstanceSummary[]>(
      `/history/process-instance?${params.toString()}`,
    );

    return rows[0] ?? null;
  }

  async findHistoricActivities(
    processInstanceId: string,
  ): Promise<CamundaActivitySummary[]> {
    const params = new URLSearchParams({
      processInstanceId,
      sortBy: 'startTime',
      sortOrder: 'asc',
    });

    return this.fetchCamunda<CamundaActivitySummary[]>(
      `/history/activity-instance?${params.toString()}`,
    );
  }

  async findIncidents(
    processInstanceId: string,
  ): Promise<CamundaIncidentSummary[]> {
    const params = new URLSearchParams({
      processInstanceId,
      sortBy: 'incidentTimestamp',
      sortOrder: 'desc',
    });

    return this.fetchCamunda<CamundaIncidentSummary[]>(
      `/incident?${params.toString()}`,
    );
  }

  async getProcessVariables(
    processInstanceId: string,
  ): Promise<CamundaVariableMap> {
    const params = new URLSearchParams({
      processInstanceId,
    });

    const rows = await this.fetchCamunda<
      Array<{ name: string; type?: string; value: unknown }>
    >(`/history/variable-instance?${params.toString()}`);

    return Object.fromEntries(
      rows.map((row) => [
        row.name,
        {
          type: row.type ?? 'Unknown',
          value: row.value,
        },
      ]),
    );
  }

  async getProcessDefinitionXml(
    processDefinitionId: string,
  ): Promise<CamundaProcessDefinitionXml> {
    return this.fetchCamunda<CamundaProcessDefinitionXml>(
      `/process-definition/${encodeURIComponent(processDefinitionId)}/xml`,
    );
  }

  async getWorkflowOverview() {
    const definitions = await Promise.all(
      MONITORED_PROCESS_KEYS.map(async (key) => {
        const versions = await this.fetchCamunda<
          CamundaProcessDefinitionSummary[]
        >(`/process-definition?key=${encodeURIComponent(key)}`);

        if (versions.length === 0) {
          return null;
        }

        const latest = [...versions].sort((a, b) => b.version - a.version)[0];
        const [
          definitionXml,
          totalResult,
          activeResult,
          completedResult,
          activityStatistics,
        ] = await Promise.all([
          this.getProcessDefinitionXml(latest.id),
          this.fetchCamunda<CamundaCountResult>(
            `/history/process-instance/count?processDefinitionKey=${encodeURIComponent(key)}`,
          ),
          this.fetchCamunda<CamundaCountResult>(
            `/process-instance/count?processDefinitionKey=${encodeURIComponent(key)}`,
          ),
          this.fetchCamunda<CamundaCountResult>(
            `/history/process-instance/count?processDefinitionKey=${encodeURIComponent(key)}&finished=true`,
          ),
          Promise.all(
            versions.map((definition) =>
              this.fetchCamunda<CamundaActivityStatistics[]>(
                `/process-definition/${encodeURIComponent(definition.id)}/statistics?incidents=true`,
              ),
            ),
          ),
        ]);

        const activities = new Map<
          string,
          { activityId: string; activeInstances: number; incidents: number }
        >();

        for (const versionStatistics of activityStatistics) {
          for (const activity of versionStatistics) {
            const current = activities.get(activity.id) ?? {
              activityId: activity.id,
              activeInstances: 0,
              incidents: 0,
            };
            current.activeInstances += activity.instances ?? 0;
            current.incidents += (activity.incidents ?? []).reduce(
              (sum, incident) => sum + incident.incidentCount,
              0,
            );
            activities.set(activity.id, current);
          }
        }

        const activityRows = [...activities.values()];
        const incidents = activityRows.reduce(
          (sum, activity) => sum + activity.incidents,
          0,
        );

        return {
          processDefinitionKey: key,
          processDefinitionId: latest.id,
          processName: latest.name ?? key,
          version: latest.version,
          versions: versions.length,
          bpmnXml: definitionXml.bpmn20Xml,
          totals: {
            all: totalResult.count,
            active: activeResult.count,
            completed: completedResult.count,
            incidents,
          },
          activities: activityRows,
        };
      }),
    );

    return {
      definitions: definitions.filter(
        (definition): definition is NonNullable<typeof definition> =>
          definition !== null,
      ),
      generatedAt: new Date().toISOString(),
    };
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
