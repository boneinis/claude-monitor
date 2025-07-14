# Claude Monitor PowerShell Launcher
# This PowerShell script launches the Claude Monitor web interface

Write-Host "Starting Claude Monitor..." -ForegroundColor Green

# Change to the claude-monitor directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

# Kill any existing instance on port 3000
try {
    $processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    if ($processes) {
        $processes | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Write-Host "Stopped existing Claude Monitor instances" -ForegroundColor Yellow
    }
} catch {
    # Ignore errors if no processes found
}

# Start the monitor
Write-Host "Launching Claude Monitor web interface..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "dist/index.js", "--web-only", "--plan", "Max20" -NoNewWindow -PassThru

# Wait for server to start
Start-Sleep -Seconds 3

# Open in browser
Start-Process "http://localhost:3000"

Write-Host "Claude Monitor is running at http://localhost:3000" -ForegroundColor Green
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")