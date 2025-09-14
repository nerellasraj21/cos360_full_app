# Multi-Tenant Migration Script for COS360
# Usage: .\migrate_tenant.ps1 -schema "test_tenant_schema" -action "upgrade" -target "head"

param(
    [Parameter(Mandatory=$true)]
    [string]$schema,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("upgrade", "downgrade", "current", "history")]
    [string]$action,
    
    [Parameter(Mandatory=$false)]
    [string]$target = "head"
)

Write-Host "=== COS360 Multi-Tenant Migration ===" -ForegroundColor Green
Write-Host "Schema: $schema" -ForegroundColor Yellow
Write-Host "Action: $action" -ForegroundColor Yellow
Write-Host "Target: $target" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Green

# Set environment variable for this session
$env:SCHEMA_NAME = $schema
Write-Host "Environment variable SCHEMA_NAME set to: $env:SCHEMA_NAME" -ForegroundColor Cyan

# Execute the alembic command
switch ($action) {
    "upgrade" {
        Write-Host "Upgrading schema '$schema' to '$target'..." -ForegroundColor Blue
        & alembic upgrade $target
    }
    "downgrade" {
        Write-Host "Downgrading schema '$schema' to '$target'..." -ForegroundColor Blue
        & alembic downgrade $target
    }
    "current" {
        Write-Host "Checking current version for schema '$schema'..." -ForegroundColor Blue
        & alembic current
    }
    "history" {
        Write-Host "Showing migration history for schema '$schema'..." -ForegroundColor Blue
        & alembic history
    }
}

Write-Host "Migration operation completed." -ForegroundColor Green