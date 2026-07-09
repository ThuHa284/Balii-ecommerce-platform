param(
  [string]$OutputPath = ".env.production",
  [string]$FrontendUrl = "https://shop.example.com",
  [string]$ApiGatewayUrl = "https://api.example.com"
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $workspaceRoot ".env.production.example"
$resolvedOutputPath = Join-Path $workspaceRoot $OutputPath

if (-not (Test-Path -LiteralPath $templatePath)) {
  throw "Khong tim thay file mau: $templatePath"
}

if (Test-Path -LiteralPath $resolvedOutputPath) {
  throw "File dich da ton tai: $resolvedOutputPath"
}

$content = Get-Content -LiteralPath $templatePath -Raw
$content = $content.Replace("https://shop.example.com", $FrontendUrl)
$content = $content.Replace("https://api.example.com", $ApiGatewayUrl)

Set-Content -LiteralPath $resolvedOutputPath -Value $content -Encoding UTF8

Write-Host "Da tao file: $resolvedOutputPath"
Write-Host ""
Write-Host "Can dien secret that cho cac nhom bien sau truoc khi deploy:"
Write-Host "- DB_USERNAME, DB_PASSWORD"
Write-Host "- JWT_SECRET, JWT_REFRESH_SECRET"
Write-Host "- MAIL_*"
Write-Host "- CLOUDINARY_*"
Write-Host "- VNPAY_*"
Write-Host "- SERPAPI_KEY"
Write-Host "- GEMINI_*"
Write-Host "- FASHN_API_KEY"
Write-Host ""
Write-Host "Lenh kiem tra:"
Write-Host "npm run validate:prod-env -- $OutputPath"
Write-Host ""
Write-Host "Lenh deploy:"
Write-Host "APP_ENV_FILE=$OutputPath docker compose --env-file $OutputPath -f docker-compose.prod.yml up --build -d"
