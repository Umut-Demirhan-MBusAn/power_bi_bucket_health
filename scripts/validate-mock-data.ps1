param(
    [string]$Path = "test/fixtures/bucket_health_components.csv"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "CSV fixture not found: $Path"
}

$rows = Import-Csv -LiteralPath $Path
if ($rows.Count -eq 0) {
    Write-Error "CSV fixture has no rows: $Path"
}

$expectedColumns = @(
    "machine_key",
    "machine_name",
    "machine_type",
    "component_key",
    "component_name",
    "component_category",
    "component_order",
    "status",
    "last_seen_utc",
    "tag_id",
    "alarm_time"
)

$allColumns = @($rows[0].PSObject.Properties.Name)
$errors = New-Object System.Collections.Generic.List[string]

foreach ($column in $expectedColumns) {
    if ($allColumns -notcontains $column) {
        $errors.Add("Missing expected column '$column'.")
    }
}

foreach ($column in $allColumns) {
    if ($expectedColumns -notcontains $column) {
        $errors.Add("Unexpected column '$column'.")
    }
}

$allowedCategories = @("tooth", "lipShroud", "wingShroud")
$allowedStatuses = @(
    "OK",
    "No data (1h)",
    "Lockout",
    "Lockout + No data",
    "Proximity alarm",
    "Movement alarm"
)

for ($i = 0; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    $line = $i + 2

    foreach ($column in @("machine_key", "component_key", "component_category", "component_order", "status")) {
        if ([string]::IsNullOrWhiteSpace($row.$column)) {
            $errors.Add("Line ${line}: '$column' is required.")
        }
    }

    if ($row.component_category -and ($allowedCategories -notcontains $row.component_category)) {
        $errors.Add("Line ${line}: component_category '$($row.component_category)' is not allowed.")
    }

    if ($row.status -and ($allowedStatuses -notcontains $row.status)) {
        $errors.Add("Line ${line}: status '$($row.status)' is not allowed.")
    }

    $order = 0
    if (-not [int]::TryParse($row.component_order, [ref]$order) -or $order -lt 1) {
        $errors.Add("Line ${line}: component_order '$($row.component_order)' must be an integer >= 1.")
    }
}

$machineGroups = $rows | Group-Object machine_key
if ($machineGroups.Count -gt 20) {
    $errors.Add("Fixture has $($machineGroups.Count) machines; maximum supported machine count is 20.")
}

foreach ($machineGroup in $machineGroups) {
    $machine = $machineGroup.Name
    $machineRows = @($machineGroup.Group)
    $componentDuplicates = $machineRows |
        Group-Object component_key |
        Where-Object { $_.Count -gt 1 }

    foreach ($duplicate in $componentDuplicates) {
        $errors.Add("Machine '$machine' has duplicate component_key '$($duplicate.Name)'.")
    }

    $teethCount = @($machineRows | Where-Object { $_.component_category -eq "tooth" }).Count
    if ($teethCount -lt 4 -or $teethCount -gt 20) {
        $errors.Add("Machine '$machine' has $teethCount tooth rows; supported range is 4-20.")
    }

    $lipCount = @($machineRows | Where-Object { $_.component_category -eq "lipShroud" }).Count
    if ($lipCount -ne ($teethCount - 1)) {
        $errors.Add("Machine '$machine' has $lipCount lip shroud rows; expected $($teethCount - 1).")
    }

    $wingCount = @($machineRows | Where-Object { $_.component_category -eq "wingShroud" }).Count
    if ($wingCount -gt 8) {
        $errors.Add("Machine '$machine' has $wingCount wing shrouds; maximum total is 8.")
    }
}

if ($errors.Count -gt 0) {
    Write-Host "Mock data validation failed:" -ForegroundColor Red
    foreach ($message in $errors) {
        Write-Host " - $message" -ForegroundColor Red
    }
    exit 1
}

Write-Host "Mock data validation passed: $($rows.Count) rows, $($machineGroups.Count) machines." -ForegroundColor Green
