# PowerShell script to add all expense tracking permissions to Enterprise plan
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MDhiYTIxMC0yZmQzLTRmMTUtODQ2Ni0wY2JjODczOTJkODQiLCJ1c2VybmFtZSI6InN1cGVyYWRtaW4iLCJ1c2VyX3R5cGUiOiJzdXBlcl9hZG1pbiIsInBlcm1pc3Npb25zIjpbInN5c3RlbV9hZG1pbiIsInRlbmFudF9tYW5hZ2VtZW50IiwicGxhbl9tYW5hZ2VtZW50Il0sImV4cCI6MTc1ODAwOTI0NywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.xSiKxSL8-y4CNDo0RIUrL4bM2J32fVQ5fpmyhhCvnk4"
$baseUrl = "http://localhost:8000/api/v1/super_admin/plans/4/resources"

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

# Add each resource-action combination
foreach ($resource in $resources) {
    foreach ($action in $actions) {
        $url = "$baseUrl" + "?resource_name=$resource&action_name=$action"
        Write-Host "Adding $resource`:$action..."

        try {
            $result = Invoke-RestMethod -Uri $url -Method POST -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            }
            Write-Host "✅ Added $resource`:$action" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ Failed to add $resource`:$action - $($_.Exception.Message)" -ForegroundColor Red
        }

        # Small delay to avoid overwhelming the API
        Start-Sleep -Milliseconds 200
    }
}

Write-Host "`n✅ Finished adding expense tracking permissions to Enterprise plan"