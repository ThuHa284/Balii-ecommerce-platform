#!/bin/bash

CAMUNDA_URL=${CAMUNDA_URL:-http://localhost:8080/engine-rest}
DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-balii-payment-workflows}

echo "Deploying BPMN files to Camunda..."
echo "Camunda URL: $CAMUNDA_URL"

curl --fail --show-error --silent -X POST "$CAMUNDA_URL/deployment/create" \
  -F "deployment-name=$DEPLOYMENT_NAME" \
  -F "enable-duplicate-filtering=true" \
  -F "deploy-changed-only=true" \
  -F "payment-processing=@infra/camunda/bpmn/balii-payment-processing.bpmn" \
  -F "payment-reconciliation=@infra/camunda/bpmn/balii-payment-reconciliation.bpmn" \
  -F "refund-workflow=@infra/camunda/bpmn/balii-refund-workflow.bpmn"

echo ""
echo "Activating process definitions..."

curl --fail --show-error --silent -X PUT "$CAMUNDA_URL/process-definition/key/Process_Payment_Processing/suspended" \
  -H "Content-Type: application/json" \
  -d '{"suspended":false,"includeProcessInstances":false}'

curl --fail --show-error --silent -X PUT "$CAMUNDA_URL/process-definition/key/Process_Payment_Reconciliation/suspended" \
  -H "Content-Type: application/json" \
  -d '{"suspended":false,"includeProcessInstances":false}'

curl --fail --show-error --silent -X PUT "$CAMUNDA_URL/process-definition/key/Process_Refund_Workflow/suspended" \
  -H "Content-Type: application/json" \
  -d '{"suspended":false,"includeProcessInstances":false}'

echo ""
echo "Deployment completed."
