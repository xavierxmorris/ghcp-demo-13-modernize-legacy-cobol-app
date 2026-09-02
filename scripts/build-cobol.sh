#!/usr/bin/env bash
# Compile the legacy COBOL programs into build/accountsystem.
#
# Ubuntu note: `apt-get install gnucobol` installs the transitional package,
# which pulls GnuCOBOL 4.0-early-dev. `gnucobol3` (3.1.2) is the stable release.
# Both produce byte-identical output for this program, so either is fine, but
# CI pins one so the golden master stays reproducible.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p build

if ! command -v cobc >/dev/null 2>&1; then
  cat >&2 <<'EOF'
GnuCOBOL (cobc) is not installed.

  Ubuntu / Debian : sudo apt-get update && sudo apt-get install -y gnucobol3
  macOS (Homebrew): brew install gnucobol
  Anywhere        : open this repo in the devcontainer or a GitHub Codespace

Alternatively set COBOL_BIN to a binary you built elsewhere.
EOF
  exit 1
fi

cobc --version | head -1
cobc -Wall -x main.cob operations.cob data.cob -o build/accountsystem
echo "Built build/accountsystem"
