param(
  [string]$CamundaUrl = "http://localhost:8080/engine-rest",
  [string]$DeploymentName = "balii-payment-workflows"
)

$ErrorActionPreference = "Stop"

$paymentProcessing = Resolve-Path "infra/camunda/bpmn/balii-payment-processing.bpmn"
$paymentReconciliation = Resolve-Path "infra/camunda/bpmn/balii-payment-reconciliation.bpmn"
$refundWorkflow = Resolve-Path "infra/camunda/bpmn/balii-refund-workflow.bpmn"

Write-Host "Deploying BPMN files to Camunda..."
Write-Host "Camunda URL: $CamundaUrl"

& curl.exe `
  --fail `
  --request POST `
  "$CamundaUrl/deployment/create" `
  --form "deployment-name=$DeploymentName" `
  --form "enable-duplicate-filtering=true" `
  --form "deploy-changed-only=true" `
  --form "payment-processing=@$paymentProcessing" `
  --form "payment-reconciliation=@$paymentReconciliation" `
  --form "refund-workflow=@$refundWorkflow"

if ($LASTEXITCODE -ne 0) {
  throw "BPMN deployment failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Activating process definitions..."

$processKeys = @(
  "Process_Payment_Processing",
  "Process_Payment_Reconciliation",
  "Process_Refund_Workflow"
)

foreach ($processKey in $processKeys) {
  Invoke-RestMethod `
    -Method Put `
    -Uri "$CamundaUrl/process-definition/key/$processKey/suspended" `
    -ContentType "application/json" `
    -Body '{"suspended":false,"includeProcessInstances":false}'
}

Write-Host ""
Write-Host "Deployment completed."
