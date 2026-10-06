param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Get-CommandInfo([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return [ordered]@{ present = $false; path = $null; version = $null }
  }

  $version = $null
  try {
    switch ($Name) {
      "python" { $version = (& $command.Source --version 2>&1 | Select-Object -First 1).ToString().Trim() }
      "py"     { $version = (& $command.Source --version 2>&1 | Select-Object -First 1).ToString().Trim() }
      "git"    { $version = (& $command.Source --version 2>&1 | Select-Object -First 1).ToString().Trim() }
      "node"   { $version = (& $command.Source --version 2>&1 | Select-Object -First 1).ToString().Trim() }
    }
  } catch {
    $version = "present_version_unavailable"
  }

  return [ordered]@{
    present = $true
    path = $command.Source
    version = $version
  }
}

if (-not ("ArborProcessorFeatures" -as [type])) {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ArborProcessorFeatures {
  [DllImport("kernel32.dll")]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool IsProcessorFeaturePresent(uint processorFeature);
}
"@
}

$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$computer = Get-CimInstance Win32_ComputerSystem

$instructionSets = [ordered]@{
  sse2 = [ArborProcessorFeatures]::IsProcessorFeaturePresent(10)
  sse42 = [ArborProcessorFeatures]::IsProcessorFeaturePresent(38)
  avx = [ArborProcessorFeatures]::IsProcessorFeaturePresent(39)
  avx2 = [ArborProcessorFeatures]::IsProcessorFeaturePresent(40)
  avx512f = [ArborProcessorFeatures]::IsProcessorFeaturePresent(41)
}

$systemDrive = $env:SystemDrive
if ([string]::IsNullOrWhiteSpace($systemDrive)) {
  $systemDrive = "C:"
}
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$systemDrive'"

$ramBytes = [double]$computer.TotalPhysicalMemory
$freeBytes = if ($null -ne $disk) { [double]$disk.FreeSpace } else { 0 }
$ramGiB = [math]::Round($ramBytes / 1GB, 2)
$freeGiB = [math]::Round($freeBytes / 1GB, 2)

$x64 = $env:PROCESSOR_ARCHITECTURE -match "AMD64|x86_64"
$ramOkay = $ramGiB -ge 7.0
$storageOkay = $freeGiB -ge 12.0

$reasons = New-Object System.Collections.Generic.List[string]
if (-not $x64) { $reasons.Add("64-bit x86 Windows process required for this pilot") }
if (-not $ramOkay) { $reasons.Add("At least 7 GiB usable physical RAM recommended") }
if (-not $storageOkay) { $reasons.Add("At least 12 GiB free system-drive space recommended before installing runtime artifacts") }

$result = [ordered]@{
  schemaVersion = 1
  scope = "read_only_local_hardware_preflight"
  machineIdentityCollected = $false
  operatingSystem = [ordered]@{
    caption = $os.Caption
    version = $os.Version
    buildNumber = $os.BuildNumber
    osArchitecture = $os.OSArchitecture
  }
  processor = [ordered]@{
    name = $cpu.Name
    cores = [int]$cpu.NumberOfCores
    logicalProcessors = [int]$cpu.NumberOfLogicalProcessors
    addressWidth = [int]$cpu.AddressWidth
    instructionSets = $instructionSets
  }
  memory = [ordered]@{
    totalGiB = $ramGiB
  }
  storage = [ordered]@{
    drive = $systemDrive
    freeGiB = $freeGiB
  }
  tools = [ordered]@{
    python = Get-CommandInfo "python"
    pyLauncher = Get-CommandInfo "py"
    git = Get-CommandInfo "git"
    node = Get-CommandInfo "node"
  }
  assessment = [ordered]@{
    localCpuPilotEligible = ($x64 -and $ramOkay -and $storageOkay)
    intendedMode = "cpu_only_bounded_pilot"
    dedicatedGpuRequired = $false
    instructionSetCompatibilityVerified = $false
    realModelCompatibilityVerified = $false
    notes = @(
      "This script installs nothing, downloads nothing, and does not inspect device IDs or serial numbers.",
      "Eligibility means only that a bounded CPU pilot is worth attempting; it is not a speed or compatibility guarantee.",
      "AVX/AVX2/AVX512 flags come from Windows IsProcessorFeaturePresent and let the later runtime choose a compatible CPU build.",
      "Exact model, tokenizer, adapter, receiver and context limits still require artifact/runtime verification."
    )
    holdReasons = @($reasons)
  }
}

$json = $result | ConvertTo-Json -Depth 8
Write-Output $json

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
  $fullPath = [System.IO.Path]::GetFullPath($OutputPath)
  $parent = [System.IO.Path]::GetDirectoryName($fullPath)
  if (-not [string]::IsNullOrWhiteSpace($parent) -and -not (Test-Path -LiteralPath $parent)) {
    throw "Output directory does not exist: $parent"
  }
  [System.IO.File]::WriteAllText(
    $fullPath,
    $json,
    [System.Text.UTF8Encoding]::new($false)
  )
}
