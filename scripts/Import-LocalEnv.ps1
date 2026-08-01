param(
    [string]$Path = ""
)

$repositoryRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($Path)) {
    $privateEnv = Join-Path $repositoryRoot ".env"
    $Path = if (Test-Path -LiteralPath $privateEnv) {
        $privateEnv
    } else {
        Join-Path $repositoryRoot ".env.example"
    }
}

$resolvedPath = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
foreach ($line in Get-Content -LiteralPath $resolvedPath) {
    if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        continue
    }

    $name = $matches[1]
    $value = $matches[2].Trim()
    if ($value.Length -ge 2) {
        $first = $value[0]
        $last = $value[$value.Length - 1]
        if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
            $value = $value.Substring(1, $value.Length - 2)
        }
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
}

Write-Host "Loaded local environment into this PowerShell process from $resolvedPath"
