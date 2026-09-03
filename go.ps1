<#
.SYNOPSIS
    One-command runner for the COBOL to Node.js modernisation lab.

.DESCRIPTION
    Compiles the legacy COBOL, proves it still matches its recorded golden
    master, proves the Node.js port matches the specification, and runs the
    tests.

    GnuCOBOL does not ship for Windows. If `cobc` is not on PATH this script
    runs everything inside a container built from scripts/Dockerfile.lab
    (GnuCOBOL 3.1.2 + Node 22, matching CI). Use -NoDocker to refuse that and
    run only the parts that work natively.

.EXAMPLE
    .\go.ps1 -Check      # full verification (default)
    .\go.ps1 -Live       # the demo beats, with pauses
    .\go.ps1 -Manual     # print the commands instead of running them
    .\go.ps1 -NoDocker   # never shell out to Docker
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [switch]$Live,
    [switch]$Manual,
    [switch]$NoDocker
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$IMAGE = 'cobol-lab:local'

function Step($text) { Write-Host "`n=== $text" -ForegroundColor Cyan }
function Ok($text)   { Write-Host "  OK  $text" -ForegroundColor Green }
function Bad($text)  { Write-Host "  !!  $text" -ForegroundColor Red }
function Note($text) { Write-Host "      $text" -ForegroundColor DarkGray }

if ($Manual) {
    Write-Host @'
Manual walkthrough
------------------
 1. sudo apt-get install -y gnucobol3     # or: brew install gnucobol
 2. npm run build:cobol                   # compile the legacy system
 3. npm run parity:list                   # 24 specified behaviours, strict vs quirk
 4. npm run parity:cobol -- --strict      # the COBOL still matches its golden master
 5. npm run parity:node                   # the port matches the specification
 6. npm test                              # 83 assertions
 7. node parity/cli.mjs verify --target node --policy bug-for-bug
                                          # every failure here is a deliberate
                                          # behaviour change: the remediation manifest

No npm install: the project has zero dependencies.
'@
    return
}

if (-not ($Check -or $Live)) { $Check = $true }

# ---------------------------------------------------------------- toolchain --
$haveCobc   = [bool](Get-Command cobc   -ErrorAction SilentlyContinue)
$haveNode   = [bool](Get-Command node   -ErrorAction SilentlyContinue)
$haveDocker = [bool](Get-Command docker -ErrorAction SilentlyContinue)
$useDocker  = $false

Step 'Checking the toolchain'
if ($haveCobc) {
    Ok "cobc found: $((cobc --version | Select-Object -First 1))"
} elseif ($NoDocker) {
    Bad 'cobc not found and -NoDocker was given.'
    Note 'The COBOL parity suites will be skipped. Unit tests still run.'
} elseif ($haveDocker) {
    docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $useDocker = $true
        Ok 'cobc not found; using Docker (GnuCOBOL 3.1.2 + Node 22)'
    } else {
        Bad 'Docker is installed but the daemon is not running. Start Docker Desktop.'
        Note 'Continuing without the COBOL suites.'
    }
} else {
    Bad 'Neither GnuCOBOL nor Docker is available.'
    Note 'Install GnuCOBOL, use the devcontainer, or open a GitHub Codespace.'
}

if (-not $haveNode -and -not $useDocker) { Bad 'Node.js 20.11+ is required.'; exit 1 }

if ($useDocker) {
    Step 'Building the lab image (first run only)'
    docker build -q -f scripts/Dockerfile.lab -t $IMAGE . | Out-Null
    if ($LASTEXITCODE -ne 0) { Bad 'docker build failed'; exit 1 }
    Ok $IMAGE
}

# Run a command either natively or in the container, from the repository root.
# Native invocation avoids bash so this works on Windows when GnuCOBOL happens
# to be present (MSYS/Cygwin builds) or when only the Node parts can run.
function Invoke-Lab([string]$Exe, [string[]]$Arguments) {
    # Output goes straight to the host so the function's return value is the
    # exit code alone. Without Out-Host, PowerShell returns the command's
    # output *and* the exit code as one array, and every `-ne 0` check breaks.
    if ($useDocker) {
        $joined = (@($Exe) + $Arguments) -join ' '
        docker run --rm -e NO_COLOR=1 -v "${PSScriptRoot}:/work" -w /work $IMAGE bash -lc $joined 2>&1 | Out-Host
    } else {
        $native = if ($IsWindows -and $Exe -eq 'npm') { 'npm.cmd' } else { $Exe }
        & $native @Arguments 2>&1 | Out-Host
    }
    return $LASTEXITCODE
}

$cobolAvailable = $haveCobc -or $useDocker

# -------------------------------------------------------------------- check --
if ($Check) {
    if ($cobolAvailable) {
        Step 'Compiling the legacy COBOL'
        if ((Invoke-Lab 'npm' @('run', 'build:cobol')) -ne 0) { Bad 'compile failed'; exit 1 }
        Ok 'build/accountsystem'

        Step 'The legacy binary still matches its recorded golden master'
        if ((Invoke-Lab 'npm' @('run', 'parity:cobol', '--', '--strict')) -ne 0) { Bad 'legacy parity broken'; exit 1 }

        Step 'The Node.js port matches the specification'
        if ((Invoke-Lab 'npm' @('run', 'parity:node')) -ne 0) { Bad 'migration parity broken'; exit 1 }
    } else {
        Note 'Skipping the COBOL parity suites: no compiler available.'
    }

    Step 'Tests'
    if ((Invoke-Lab 'npm' @('test')) -ne 0) { Bad 'tests failed'; exit 1 }

    Step 'Remediation manifest'
    Note 'Every failure below is a legacy defect the port fixes on purpose.'
    Invoke-Lab 'node' @('parity/cli.mjs', 'verify', '--target', 'node', '--policy', 'bug-for-bug') | Out-Null

    Write-Host ''
    Ok 'Everything checks out. Start with docs/LEGACY-BEHAVIOR.md'
    return
}

# --------------------------------------------------------------------- live --
if ($Live) {
    if (-not $cobolAvailable) { Bad 'The live walkthrough needs GnuCOBOL or Docker.'; exit 1 }
    function Pause($beat) { Write-Host "`n--- $beat  (Enter to continue)" -ForegroundColor Yellow; [void](Read-Host) }

    Pause 'Beat 1 - what the legacy system is specified to do'
    Invoke-Lab 'npm' @('run', 'parity:list') | Out-Null

    Pause 'Beat 2 - the specification is recorded from the real binary, and it holds'
    Invoke-Lab 'npm' @('run', 'build:cobol') | Out-Null
    Invoke-Lab 'npm' @('run', 'parity:cobol', '--', '--strict') | Out-Null

    Pause 'Beat 3 - the modern port satisfies the same specification'
    Invoke-Lab 'npm' @('run', 'parity:node') | Out-Null

    Pause 'Beat 4 - and here is exactly what it changed on purpose'
    Invoke-Lab 'node' @('parity/cli.mjs', 'verify', '--target', 'node', '--policy', 'bug-for-bug') | Out-Null

    Write-Host "`nLand it: that failure list is the remediation manifest." -ForegroundColor Cyan
    Write-Host "Generated, not remembered. See docs/LEGACY-BEHAVIOR.md" -ForegroundColor Cyan
}
