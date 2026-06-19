param(
  [string]$Root = "."
)

$resolved = Resolve-Path $Root
Write-Host "== Largest project files (excluding node_modules/.git) =="
Get-ChildItem -LiteralPath $resolved -Recurse -File -Force |
  Where-Object { $_.FullName -notmatch "\\node_modules\\|\\.git\\" } |
  Sort-Object Length -Descending |
  Select-Object -First 30 @{ Name = "SizeMB"; Expression = { [math]::Round($_.Length / 1MB, 2) } }, FullName |
  Format-Table -AutoSize

Write-Host "`n== Assets =="
if (Test-Path "$resolved/assets") {
  Get-ChildItem "$resolved/assets" -Recurse -File |
    Sort-Object Length -Descending |
    Select-Object @{ Name = "SizeKB"; Expression = { [math]::Round($_.Length / 1KB, 1) } }, FullName |
    Format-Table -AutoSize
}

Write-Host "`n== Android artifacts =="
$androidArtifacts = @(Get-ChildItem -LiteralPath $resolved -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\node_modules\\|\\.git\\" -and $_.Extension -in ".apk", ".aab" } |
  Sort-Object Length -Descending)

$androidArtifacts |
  Select-Object @{ Name = "SizeMB"; Expression = { [math]::Round($_.Length / 1MB, 2) } }, FullName |
  Format-Table -AutoSize

if ($androidArtifacts.Count -eq 0) {
  Write-Host "No local .apk/.aab artifacts found."
}
