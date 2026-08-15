param(
  [ValidateSet('Start', 'Stop', 'Status')]
  [string]$Action = 'Start'
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $workspaceRoot

$env:NEXT_PUBLIC_API_URL = 'http://localhost:4000'
$env:NEXT_PUBLIC_SOCKET_URL = 'http://localhost:4000'
$env:APP_ENV_FILE = '.env'

$composeArgs = @(
  'compose',
  '--env-file', '.env',
  '-f', 'docker-compose.prod.yml',
  '-f', 'docker-compose.local.yml'
)

function Invoke-Compose {
  param([string[]]$Arguments)
  & docker @composeArgs @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose thất bại với mã $LASTEXITCODE"
  }
}

if ($Action -eq 'Stop') {
  Invoke-Compose @('stop')
  Write-Host 'Đã dừng bộ demo local. Volume và dữ liệu vẫn được giữ nguyên.'
  exit 0
}

if ($Action -eq 'Status') {
  Invoke-Compose @('ps')
  exit 0
}

try {
  & docker info *> $null
} catch {
  throw 'Docker Desktop chưa chạy. Hãy mở Docker Desktop, đợi engine sẵn sàng rồi chạy lại: npm run demo:local:start'
}

Invoke-Compose @('up', '-d', '--build')

Write-Host ''
Write-Host 'Bộ demo local đã được khởi động:'
Write-Host '- Balii Admin:       http://localhost:3000/admin/workflows'
Write-Host '- Camunda Cockpit:   http://localhost:8082/camunda/app/cockpit/default/'
Write-Host '- Kafka UI:          http://localhost:8081'
Write-Host '- Vector DB Admin:   http://localhost:3000/admin/vector-database'
Write-Host '- Qdrant Dashboard:  http://localhost:6335/dashboard'
Write-Host '- API readiness:     http://localhost:4000/health/ready'
Write-Host ''
Write-Host 'Nếu Camunda yêu cầu đăng nhập, dùng tài khoản demo/demo.'
