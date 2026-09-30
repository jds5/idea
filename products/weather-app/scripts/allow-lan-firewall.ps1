#requires -RunAsAdministrator
param(
    [Parameter(Mandatory=$true)][string]$Address,
    [ValidateRange(1024,65535)][int]$Port = 8790,
    [ValidateRange(1024,65535)][int]$BackendPort = 18790,
    [switch]$Remove
)
$ErrorActionPreference = 'Stop'
$ruleName = "Dayward-LAN-Test-$Port"
if ($Remove) {
    Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    netsh interface portproxy delete v4tov4 "listenaddress=$Address" "listenport=$Port"
    Write-Host "Removed $ruleName and the specified LAN port proxy (if present)."
    return
}
$interface = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $Address -ErrorAction Stop
if ($Port -eq $BackendPort) { throw 'LAN and backend ports must differ.' }
if ((Get-Service iphlpsvc).Status -ne 'Running') { throw 'Windows IP Helper (iphlpsvc) must be running for port forwarding.' }
Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 5 | Out-Null
netsh interface portproxy add v4tov4 "listenaddress=$Address" "listenport=$Port" connectaddress=127.0.0.1 "connectport=$BackendPort"
if ($LASTEXITCODE -ne 0) { throw 'Windows port proxy configuration failed.' }
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($existing) { $existing | Remove-NetFirewallRule }
New-NetFirewallRule -Name $ruleName -DisplayName "Dayward local phone testing (TCP $Port)" -Direction Inbound -Action Allow -Protocol TCP -LocalAddress $Address -LocalPort $Port -RemoteAddress LocalSubnet -InterfaceAlias $interface.InterfaceAlias -Profile Any | Out-Null
Write-Host "Allowed local subnet clients on $($interface.InterfaceAlias) to ${Address}:$Port, forwarded to Docker loopback port $BackendPort."
Invoke-RestMethod -Uri "http://${Address}:$Port/health" -TimeoutSec 5
Write-Host "Open http://${Address}:$Port/test on your phone."
