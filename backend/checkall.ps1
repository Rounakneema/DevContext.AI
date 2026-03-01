param(
    [int]$Minutes = 15,
    [string]$Region = "ap-southeast-1"
)

Write-Host "Fetching devcontext logs from last $Minutes minutes..." -ForegroundColor Cyan

# Get log groups as JSON array
$logGroupsJson = aws logs describe-log-groups `
    --region $Region `
    --query "logGroups[?contains(logGroupName, 'devcontext')].logGroupName" `
    --output json

$logGroups = $logGroupsJson | ConvertFrom-Json

foreach ($group in $logGroups) {

    Write-Host "`n==================================================" -ForegroundColor Yellow
    Write-Host "Log Group: $group" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Yellow

    aws logs tail $group `
        --since ${Minutes}m `
        --region $Region
}