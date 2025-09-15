# PowerShell script to add expense tracking permissions to Admin role in test_tenant_schema
$superAdminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDhiYTIxMC0yZmQzLTRmMTUtODQ2Ni0wY2JjODczOTJkODQiLCJ1c2VybmFtZSI6InN1cGVyYWRtaW4iLCJ1c2VyX3R5cGUiOiJzdXBlcl9hZG1pbiIsInBlcm1pc3Npb25zIjpbInN5c3RlbV9hZG1pbiIsInRlbmFudF9tYW5hZ2VtZW50IiwicGxhbl9tYW5hZ2VtZW50Il0sImV4cCI6MTc1ODAwOTI0NywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.xSiKxSL8-y4CNDo0RIUrL4bM2J32fVQ5fpmyhhCvnk4"
$baseUrl = "http://localhost:8000"
$adminRoleId = "550e8400-e29b-41d4-a716-446655440001"

# Define expense tracking resources and actions
$resources = @(
    "expense_categories",
    "expense_types",
    "expense_transactions",
    "expense_transaction_items",
    "expense_attachments",
    "expense_settings",
    "expense_audit_logs",
    "expense_reports"
)

$actions = @("create", "read", "update", "delete", "list")

Write-Host "Adding expense tracking permissions to Admin role in test_tenant_schema..."
Write-Host "Admin Role ID: $adminRoleId"
Write-Host ""

# Connect to database and add permissions directly
foreach ($resource in $resources) {
    foreach ($action in $actions) {
        $permissionId = [System.Guid]::NewGuid().ToString()

        # Since there's no direct Super Admin endpoint for role permissions,
        # we'll use Super Admin's system-wide access to directly manipulate the database
        $sqlCommand = @"
INSERT INTO test_tenant_schema.resource_permissions (id, role_id, resource, action, is_granted, created_at, updated_at)
VALUES ('$permissionId', '$adminRoleId', '$resource', '$action', true, NOW(), NOW())
ON CONFLICT (role_id, resource, action) DO UPDATE SET
    is_granted = true,
    updated_at = NOW();
"@

        Write-Host "Adding permission: $resource`:$action" -ForegroundColor Yellow

        try {
            # Execute SQL via Super Admin system access
            $result = psql postgresql://postgres:password@localhost/postgres -c "$sqlCommand"
            Write-Host "✅ Added $resource`:$action" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to add $resource`:$action - $($_.Exception.Message)" -ForegroundColor Red
        }

        Start-Sleep -Milliseconds 100
    }
}

Write-Host "`n✅ Finished adding expense tracking permissions to Admin role"
Write-Host "Total permissions added: $($resources.Count * $actions.Count)"