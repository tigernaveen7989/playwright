# Playwright Test Agent Manager - PowerShell Version

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("setup", "start", "stop", "restart", "status", "logs", "clean", "distributed", "help")]
    [string]$Command = "help",
    
    [Parameter(Mandatory=$false)]
    [string]$Agent = ""
)

# Configuration
$DockerComposeFile = "docker-compose.yml"
$AgentLogDir = "logs\agents"

function Write-Banner {
    Write-Host "==================================" -ForegroundColor Green
    Write-Host "  Playwright Test Agent Manager   " -ForegroundColor Green
    Write-Host "==================================" -ForegroundColor Green
}

function Show-Help {
    Write-Host "Usage: .\agent-manager.ps1 -Command [COMMAND] [-Agent AGENT_NAME]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  setup           Setup test agents and dependencies"
    Write-Host "  start           Start all test agents"
    Write-Host "  stop            Stop all test agents"
    Write-Host "  restart         Restart all test agents"
    Write-Host "  status          Show agent status"
    Write-Host "  logs            Show logs for specific agent or all agents"
    Write-Host "  clean           Clean up agent data and logs"
    Write-Host "  distributed     Run distributed test execution"
    Write-Host "  help            Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\agent-manager.ps1 -Command setup"
    Write-Host "  .\agent-manager.ps1 -Command start"
    Write-Host "  .\agent-manager.ps1 -Command logs -Agent api-agent"
    Write-Host "  .\agent-manager.ps1 -Command distributed"
}

function Setup-Agents {
    Write-Host "Setting up test agents..." -ForegroundColor Yellow
    
    # Create necessary directories
    New-Item -ItemType Directory -Force -Path "logs\agents" | Out-Null
    New-Item -ItemType Directory -Force -Path "allure-results" | Out-Null
    New-Item -ItemType Directory -Force -Path "allure-reports" | Out-Null
    New-Item -ItemType Directory -Force -Path "playwright-report" | Out-Null
    
    # Install dependencies
    Write-Host "Installing dependencies..."
    npm ci
    
    # Build Docker images
    Write-Host "Building Docker images..."
    docker-compose build
    
    Write-Host "✅ Agent setup completed!" -ForegroundColor Green
}

function Start-Agents {
    Write-Host "Starting test agents..." -ForegroundColor Yellow
    docker-compose up -d
    
    # Wait for services to be ready
    Start-Sleep -Seconds 10
    
    Write-Host "✅ Agents started successfully!" -ForegroundColor Green
    Show-Status
}

function Stop-Agents {
    Write-Host "Stopping test agents..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "✅ Agents stopped successfully!" -ForegroundColor Green
}

function Restart-Agents {
    Write-Host "Restarting test agents..." -ForegroundColor Yellow
    Stop-Agents
    Start-Sleep -Seconds 5
    Start-Agents
}

function Show-Status {
    Write-Host "Agent Status:" -ForegroundColor Yellow
    docker-compose ps
    
    Write-Host "`nDocker Resources:" -ForegroundColor Yellow
    docker stats --no-stream --format "table {{.Container}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.NetIO}}"
}

function Show-Logs {
    if ($Agent) {
        Write-Host "Showing logs for $Agent:" -ForegroundColor Yellow
        docker-compose logs -f $Agent
    } else {
        Write-Host "Showing logs for all agents:" -ForegroundColor Yellow
        docker-compose logs -f
    }
}

function Clean-Agents {
    Write-Host "Cleaning up agent data..." -ForegroundColor Yellow
    
    # Stop agents
    docker-compose down
    
    # Remove containers and images
    docker-compose down --rmi all --volumes --remove-orphans
    
    # Clean up log files
    if (Test-Path "logs\agents") {
        Remove-Item -Recurse -Force "logs\agents\*"
    }
    if (Test-Path "allure-results") {
        Remove-Item -Recurse -Force "allure-results\*"
    }
    if (Test-Path "playwright-report") {
        Remove-Item -Recurse -Force "playwright-report\*"
    }
    
    Write-Host "✅ Cleanup completed!" -ForegroundColor Green
}

function Start-DistributedTests {
    Write-Host "Running distributed tests..." -ForegroundColor Yellow
    
    # Ensure agents are running
    $status = docker-compose ps --format json | ConvertFrom-Json
    if (-not ($status | Where-Object { $_.State -eq "running" })) {
        Start-Agents
    }
    
    # Run distributed test manager
    npx ts-node utilities/distributed-test-agent.ts
    
    Write-Host "✅ Distributed tests completed!" -ForegroundColor Green
}

# Main script logic
Write-Banner

switch ($Command) {
    "setup" { Setup-Agents }
    "start" { Start-Agents }
    "stop" { Stop-Agents }
    "restart" { Restart-Agents }
    "status" { Show-Status }
    "logs" { Show-Logs }
    "clean" { Clean-Agents }
    "distributed" { Start-DistributedTests }
    default { Show-Help }
}