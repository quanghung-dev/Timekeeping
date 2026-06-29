$ErrorActionPreference = 'Stop'

function Test-Java21([string]$JavaHome) {
  if (-not $JavaHome) { return $false }
  $java = Join-Path $JavaHome 'bin\java.exe'
  if (-not (Test-Path -LiteralPath $java)) { return $false }
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $versionOutput = (& $java -version 2>&1 | Out-String)
  $ErrorActionPreference = $previousPreference
  return $versionOutput -match 'version "(2[1-9]|[3-9][0-9])(?:\.|\")'
}

$candidates = @(
  $env:JAVA_HOME,
  'C:\Program Files\Android\Android Studio\jbr',
  'C:\Program Files\Eclipse Adoptium\jdk-21'
)

$javaHome = $candidates | Where-Object { Test-Java21 $_ } | Select-Object -First 1
if (-not $javaHome) {
  throw 'Firestore Emulator requires Java 21+. Set JAVA_HOME to a compatible JDK.'
}

$env:JAVA_HOME = $javaHome
$env:PATH = "$(Join-Path $javaHome 'bin');$env:PATH"

& "$PSScriptRoot\..\node_modules\.bin\firebase.cmd" emulators:exec --only firestore "vitest run --config vitest.rules.config.ts"
exit $LASTEXITCODE
