export type CamundaProcessInstanceSummary = {
  id: string;
  definitionId?: string;
  processDefinitionId?: string;
  businessKey?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  state?: string | null;
  processDefinitionKey?: string | null;
  processDefinitionName?: string | null;
};

export type CamundaProcessDefinitionXml = {
  id: string;
  bpmn20Xml: string;
};

export type CamundaProcessDefinitionSummary = {
  id: string;
  key: string;
  name?: string | null;
  version: number;
  deploymentId?: string | null;
};

export type CamundaActivityStatistics = {
  id: string;
  instances: number;
  failedJobs: number;
  incidents?: Array<{
    incidentType: string;
    incidentCount: number;
  }>;
};

export type CamundaCountResult = {
  count: number;
};

export type CamundaActivitySummary = {
  id: string;
  activityId: string;
  activityName?: string | null;
  activityType?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  canceled?: boolean;
  completeScope?: boolean;
  processInstanceId?: string;
};

export type CamundaIncidentSummary = {
  id: string;
  activityId?: string | null;
  processInstanceId?: string | null;
  incidentMessage?: string | null;
  incidentType?: string | null;
  created?: string | null;
  executionId?: string | null;
};

export type CamundaVariableMap = Record<
  string,
  {
    type?: string;
    value: unknown;
  }
>;
