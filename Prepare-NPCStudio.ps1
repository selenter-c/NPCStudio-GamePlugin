[CmdletBinding()]
param(
    [string]$Installer = (Join-Path $PSScriptRoot 'NPCStudio-0.8.7-beta.3-fomod.zip'),
    [string]$UpstreamArchive
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$installerPath = (Resolve-Path -LiteralPath $Installer).Path
$output = Join-Path (Split-Path -Parent $installerPath) 'NPCStudio-0.8.7-beta.3-local-fomod.zip'
$temp = Join-Path ([IO.Path]::GetTempPath()) ([IO.Path]::GetRandomFileName())
$staged = "$output.$([Guid]::NewGuid().ToString('N')).tmp"
$downloaded = -not $UpstreamArchive
try {
    if ($downloaded) {
        $UpstreamArchive = $temp
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Write-Host 'Downloading the original SeverActions 4.7.0 archive...'
        Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/Severause/SeverActions/releases/download/v4.7.0/SeverActions-4.7.0-FOMOD.zip' -OutFile $UpstreamArchive
    }
    $expected = '91e4c77514811a6cf8e40d5e9beeba42463866b65e46e623941141a9648ebf83'
    if ((Get-FileHash -LiteralPath $UpstreamArchive -Algorithm SHA256).Hash -ine $expected) {
        throw 'The SeverActions 4.7.0 archive failed SHA-256 verification.'
    }
    Copy-Item -LiteralPath $installerPath -Destination $staged
    $source = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $UpstreamArchive).Path)
    try {
        $package = [IO.Compression.ZipFile]::Open($staged, [IO.Compression.ZipArchiveMode]::Update)
        try {
            if (-not $package.GetEntry('Core/NPCStudio.esp') -or -not $package.GetEntry('fomod/ModuleConfig.xml')) {
                throw 'The input is not an NPC Studio FOMOD archive.'
            }
            $prefix = '97 Phantasm/00 Core/'
            $required = 'Interface/phantasm.swf', 'SKSE/Plugins/Phantasm.dll', 'SKSE/Plugins/Phantasm/VERSION.txt'
            $entries = @{}
            foreach ($entry in $source.Entries) {
                $name = $entry.FullName.Replace('\', '/')
                if (-not $name.StartsWith($prefix, [StringComparison]::Ordinal)) { continue }
                $relative = $name.Substring($prefix.Length)
                if ($relative -cin $required -or $relative -cmatch '^SKSE/Plugins/Phantasm/Licenses/[A-Za-z0-9._-]+\.txt$') {
                    if ($entries.ContainsKey($relative)) { throw "Duplicate upstream entry: $relative" }
                    $entries[$relative] = $entry
                }
            }
            foreach ($name in $required) {
                if (-not $entries.ContainsKey($name)) { throw "Missing upstream entry: $name" }
            }
            foreach ($name in $entries.Keys) {
                $target = "Core/$name"
                if ($package.GetEntry($target)) { throw "The installer already contains $target" }
                $inputStream = $entries[$name].Open()
                try {
                    $outputStream = $package.CreateEntry($target, [IO.Compression.CompressionLevel]::Optimal).Open()
                    try { $inputStream.CopyTo($outputStream) }
                    finally { $outputStream.Dispose() }
                } finally { $inputStream.Dispose() }
            }
        } finally { $package.Dispose() }
    } finally { $source.Dispose() }
    Move-Item -LiteralPath $staged -Destination $output -Force
    Write-Host "Install this archive in MO2: $output"
} finally {
    if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged }
    if ($downloaded -and (Test-Path -LiteralPath $temp)) { Remove-Item -LiteralPath $temp }
}
