$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$logDir = Join-Path $root 'runtime-logs'

if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

try {
    & docker compose up -d postgres redis | Out-Null
} catch {
    Write-Warning 'Khong the khoi dong docker compose tu dong. Hay dam bao postgres va redis dang chay.'
}

$services = @(
    @{ Name = 'user-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:user') },
    @{ Name = 'product-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:product') },
    @{ Name = 'cart-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:cart') },
    @{ Name = 'order-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:order') },
    @{ Name = 'payment-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:payment') },
    @{ Name = 'voucher-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:voucher') },
    @{ Name = 'chatbot-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:chatbot') },
    @{ Name = 'api-gateway'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:gateway') },
    @{ Name = 'virtual-tryon-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:tryon') },
    @{ Name = 'frontend'; Workdir = (Join-Path $root 'frontend'); FilePath = 'npm.cmd'; Args = @('run', 'dev', '--', '--port', '3000') }
)

$results = foreach ($service in $services) {
    $stdout = Join-Path $logDir "$($service.Name).log"
    $stderr = Join-Path $logDir "$($service.Name).error.log"

    $process = Start-Process `
        -FilePath $service.FilePath `
        -ArgumentList $service.Args `
        -WorkingDirectory $service.Workdir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru

    [PSCustomObject]@{
        Service = $service.Name
        PID = $process.Id
        Log = $stdout
        ErrorLog = $stderr
    }
}

$results | Format-Table -AutoSize | Out-String | Write-Output
Write-Output "Logs: $logDir"
