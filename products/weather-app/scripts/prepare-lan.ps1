param(
    [string]$Address,
    [ValidateRange(1024,65535)][int]$Port = 8790,
    [ValidateRange(1024,65535)][int]$BackendPort = 18790
)
$ErrorActionPreference = 'Stop'
$productRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $Address) {
    $interfaces = @(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' })
    $wifi = @($interfaces | Where-Object { $_.InterfaceAlias -match 'WLAN|Wi-Fi|Wireless' })
    if ($wifi.Count -eq 1) { $Address = $wifi[0].IPv4Address.IPAddress }
    elseif ($interfaces.Count -eq 1) { $Address = $interfaces[0].IPv4Address.IPAddress }
    else { throw 'Specify -Address with the PC IPv4 address on the same Wi-Fi as your phone.' }
}
$parsed = [Net.IPAddress]::Parse($Address)
$octets = $parsed.GetAddressBytes()
if ($octets.Length -ne 4 -or -not ($octets[0] -eq 10 -or ($octets[0] -eq 192 -and $octets[1] -eq 168) -or ($octets[0] -eq 172 -and $octets[1] -ge 16 -and $octets[1] -le 31))) { throw 'Use a private LAN IPv4 address.' }
$interface = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $Address -ErrorAction Stop
$origin = "http://${Address}:$Port"
if ($Port -eq $BackendPort) { throw 'The LAN port and Docker loopback port must differ.' }
$android = Join-Path $productRoot 'app/android'
$artifacts = Join-Path $productRoot 'artifacts'
$output = Join-Path $artifacts 'lan'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)
$environmentFile = Join-Path $artifacts 'lan.env'
# This PC's WSL2 backend is reachable on loopback. Windows portproxy supplies the LAN entry.
[IO.File]::WriteAllText($environmentFile, "DAYWARD_BIND_ADDRESS=127.0.0.1`nDAYWARD_PORT=$BackendPort`nDAYWARD_ORIGIN=$origin`n", $utf8)

Write-Host "Building device APK with gateway $origin"
docker run --rm --name dayward-android-build --memory 5g --cpus 3 -v "${android}:/workspace" -v dayward-gradle-cache:/root/.gradle -v dayward-android-home:/root/.android -w /workspace ghcr.io/cirruslabs/android-sdk@sha256:f9b3ea9ed2b5fc9522adae82c7b4622ab7aa54207ef532c8e615a347dca08f31 bash gradlew --no-daemon "-PdaywardGateway=$origin" assembleDebug testDebugUnitTest lintDebug
if ($LASTEXITCODE -ne 0) { throw 'Android build or checks failed. The running deployment has not been replaced.' }
$apk = Join-Path $android 'app/build/outputs/apk/debug/app-debug.apk'
$metadata = Get-Content (Join-Path $android 'app/build/outputs/apk/debug/output-metadata.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Copy-Item -LiteralPath $apk -Destination (Join-Path $output 'dayward-debug.apk') -Force
$build = [ordered]@{
    applicationId = $metadata.applicationId
    versionName = $metadata.elements[0].versionName
    versionCode = $metadata.elements[0].versionCode
    origin = $origin
    builtAt = [DateTime]::UtcNow.ToString('o')
    bytes = (Get-Item -LiteralPath $apk).Length
    sha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
}
[IO.File]::WriteAllText((Join-Path $output 'build.json'), ($build | ConvertTo-Json), $utf8)
$compose = @('--env-file', $environmentFile, '-f', (Join-Path $productRoot 'compose.yaml'), '-f', (Join-Path $productRoot 'compose.lan.yaml'))
docker compose @compose up -d --build source collector gateway
if ($LASTEXITCODE -ne 0) { throw 'Docker deployment failed.' }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($admin) { & (Join-Path $PSScriptRoot 'allow-lan-firewall.ps1') -Address $Address -Port $Port -BackendPort $BackendPort }
else { Write-Warning 'LAN port forwarding and firewall setup require elevated PowerShell. Run scripts/allow-lan-firewall.ps1 to enable the phone entry. No Windows network settings have been changed.' }
Write-Host "PC-only test page: http://127.0.0.1:$BackendPort/test"
Write-Host "Phone test page: $origin/test"
Write-Host "Gateway origin: $origin"
Write-Host "Wi-Fi interface: $($interface.InterfaceAlias)"
Write-Host 'Keep the PC awake and Docker Desktop running during the test.'
