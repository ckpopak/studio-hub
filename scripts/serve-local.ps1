$Port = if ($env:PORT) { $env:PORT } else { "8765" }
$HostAddr = if ($env:HOST) { $env:HOST } else { "127.0.0.1" }
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "Serving studio-hub from $Root"
Write-Host "Open http://${HostAddr}:${Port}/"
Set-Location $Root
python -m http.server $Port --bind $HostAddr --directory $Root
