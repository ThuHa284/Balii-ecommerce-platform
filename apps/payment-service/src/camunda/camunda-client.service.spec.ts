jest.mock('camunda-external-task-client-js', () => ({
  Client: jest.fn(),
  logger: {},
}));

import { CamundaClientService } from './camunda-client.service';

describe('CamundaClientService demo incident recovery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears the injected fault and retries the failed external task', async () => {
    const service = new CamundaClientService();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);

        if (url.includes('/history/variable-instance?')) {
          return new Response(
            JSON.stringify([
              {
                name: 'demoFaultTopic',
                type: 'String',
                value: 'payment.validate-request',
              },
            ]),
            { status: 200 },
          );
        }

        if (url.includes('/external-task?processInstanceId=')) {
          return new Response(
            JSON.stringify([
              {
                id: 'external-task-1',
                processInstanceId: 'process-1',
                topicName: 'payment.validate-request',
                retries: 0,
                errorMessage: '[DEMO] Injected fault',
              },
            ]),
            { status: 200 },
          );
        }

        if (
          url.endsWith(
            '/process-instance/process-1/variables/demoFaultTopic',
          ) &&
          init?.method === 'DELETE'
        ) {
          return new Response(null, { status: 204 });
        }

        if (
          url.endsWith('/external-task/external-task-1/retries') &&
          init?.method === 'PUT'
        ) {
          return new Response(null, { status: 204 });
        }

        throw new Error(`Unexpected Camunda request: ${url}`);
      });

    await expect(service.resolveDemoIncident('process-1')).resolves.toEqual({
      processInstanceId: 'process-1',
      clearedFaultTopic: 'payment.validate-request',
      retriedTasks: [
        {
          id: 'external-task-1',
          topicName: 'payment.validate-request',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/process-instance/process-1/variables/demoFaultTopic',
      ),
      { method: 'DELETE' },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/external-task/external-task-1/retries'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ retries: 1 }),
      }),
    );
  });
});
