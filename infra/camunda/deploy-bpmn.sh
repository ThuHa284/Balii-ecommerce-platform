#!/bin/bash
set -euo pipefail

CAMUNDA_URL=${CAMUNDA_URL:-http://localhost:8080/engine-rest}
DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-balii-payment-workflows}
CAMUNDA_STARTUP_TIMEOUT_SECONDS=${CAMUNDA_STARTUP_TIMEOUT_SECONDS:-120}
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

elapsed=0
until curl --fail --show-error --silent "$CAMUNDA_URL/version" >/dev/null; do
  if [ "$elapsed" -ge "$CAMUNDA_STARTUP_TIMEOUT_SECONDS" ]; then
    echo "Camunda did not become ready within ${CAMUNDA_STARTUP_TIMEOUT_SECONDS}s" >&2
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "Deploying BPMN files to Camunda..."
echo "Camunda URL: $CAMUNDA_URL"

curl --fail --show-error --silent -X POST "$CAMUNDA_URL/deployment/create" \
  -F "deployment-name=$DEPLOYMENT_NAME" \
  -F "enable-duplicate-filtering=true" \
  -F "deploy-changed-only=true" \
  -F "payment-processing=@$SCRIPT_DIR/bpmn/balii-payment-processing.bpmn" \
  -F "payment-reconciliation=@$SCRIPT_DIR/bpmn/balii-payment-reconciliation.bpmn" \
  -F "refund-workflow=@$SCRIPT_DIR/bpmn/balii-refund-workflow.bpmn"

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
