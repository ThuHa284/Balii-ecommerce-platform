param(
    [ValidateSet('local', 'production')]
    [string]$AppEnv = 'local'
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$logDir = Join-Path $root 'runtime-logs'
$env:APP_ENV = $AppEnv

if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

try {
    & docker compose up -d postgres redis zookeeper kafka camunda qdrant | Out-Null
} catch {
    Write-Warning 'Khong the khoi dong docker compose tu dong. Hay dam bao cac container ha tang dang chay.'
}

$services = @(
    @{ Name = 'user-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:user') },
    @{ Name = 'product-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:product') },
    @{ Name = 'cart-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:cart') },
    @{ Name = 'order-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:order') },
    @{ Name = 'payment-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:payment') },
    @{ Name = 'voucher-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:voucher') },
    @{ Name = 'chatbot-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:chatbot') },
    @{ Name = 'market-analysis-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('exec', 'nest', 'start', 'market-analysis-service', '--watch') },
    @{ Name = 'api-gateway'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:gateway') },
    @{ Name = 'virtual-tryon-service'; Workdir = $root; FilePath = 'npm.cmd'; Args = @('run', 'start:tryon') },
    @{ Name = 'frontend'; Workdir = (Join-Path $root 'frontend'); FilePath = 'npm.cmd'; Args = @('run', 'dev', '--', '--port', '3000') }
)

$pythonWorker = Join-Path $root 'ai-service\google-lens-worker\.venv\Scripts\python.exe'
if (Test-Path -LiteralPath $pythonWorker) {
    $services += @{
        Name = 'google-lens-worker'
        Workdir = (Join-Path $root 'ai-service\google-lens-worker')
        FilePath = $pythonWorker
        Args = @('-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8020')
        Env = @{
            USE_MOCK_LENS = 'false'
        }
    }
}

$pythonGenderAge = Join-Path $root 'ai-service\ai-gender-age-service\.venv\Scripts\python.exe'
if (Test-Path -LiteralPath $pythonGenderAge) {
    $services += @{
        Name = 'gender-age-service'
        Workdir = (Join-Path $root 'ai-service\ai-gender-age-service')
        FilePath = $pythonGenderAge
        Args = @('-m', 'uvicorn', 'app:app', '--host', '0.0.0.0', '--port', '8010')
    }
}

$results = foreach ($service in $services) {
    $stdout = Join-Path $logDir "$($service.Name).log"
    $stderr = Join-Path $logDir "$($service.Name).error.log"

    if ($service.ContainsKey('Env')) {
        $previousValues = @{}
        foreach ($entry in $service.Env.GetEnumerator()) {
            $previousValues[$entry.Key] = [Environment]::GetEnvironmentVariable($entry.Key, 'Process')
            [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
        }
    }

    try {
        $process = Start-Process `
            -FilePath $service.FilePath `
            -ArgumentList $service.Args `
            -WorkingDirectory $service.Workdir `
            -WindowStyle Hidden `
            -RedirectStandardOutput $stdout `
            -RedirectStandardError $stderr `
            -PassThru
    } finally {
        if ($service.ContainsKey('Env')) {
            foreach ($entry in $service.Env.GetEnumerator()) {
                [Environment]::SetEnvironmentVariable($entry.Key, $previousValues[$entry.Key], 'Process')
            }
        }
    }

    [PSCustomObject]@{
        Service = $service.Name
        PID = $process.Id
        Log = $stdout
        ErrorLog = $stderr
    }
}

$results | Format-Table -AutoSize | Out-String | Write-Output
Write-Output "APP_ENV: $AppEnv"
Write-Output "Logs: $logDir"
