#!/usr/bin/env bash
# Reproducible evidence for finding L-10: data.cob never executes either of its
# branches, so the balance is held by operations.cob's own WORKING-STORAGE.
#
#   bash scripts/probes/data-cob-is-dead-code.sh
#
# Requires GnuCOBOL. Writes only to a temporary directory; the repository's
# .cob files are copied, never modified.
set -uo pipefail

cd "$(dirname "$0")/../.."
REPO="$PWD"

if ! command -v cobc >/dev/null 2>&1; then
  echo "GnuCOBOL (cobc) is not installed. See scripts/build-cobol.sh." >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cobc --version | head -1
echo

# ---------------------------------------------------------------------------
echo "=== Probe 1: what does DataProgram actually receive? ==="
echo "operations.cob passes literals shorter than the PIC X(6) they arrive in:"
grep -n "USING 'READ'\|USING 'WRITE'" operations.cob | sed 's/^/    /'
echo

cd "$WORK"
cp "$REPO/main.cob" "$REPO/operations.cob" .

# data.cob instrumented to report the bytes it receives. operations.cob, which
# supplies the literal, is unmodified.
cat > data.cob <<'COB'
       IDENTIFICATION DIVISION.
       PROGRAM-ID. DataProgram.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  STORAGE-BALANCE    PIC 9(6)V99 VALUE 1000.00.
       01  OPERATION-TYPE     PIC X(6).

       LINKAGE SECTION.
       01  PASSED-OPERATION   PIC X(6).
       01  BALANCE            PIC 9(6)V99.

       PROCEDURE DIVISION USING PASSED-OPERATION BALANCE.
           MOVE PASSED-OPERATION TO OPERATION-TYPE
           DISPLAY "  [probe] received <" OPERATION-TYPE ">"
           IF OPERATION-TYPE = 'READ'
               DISPLAY "  [probe] matched READ"
               MOVE STORAGE-BALANCE TO BALANCE
           ELSE IF OPERATION-TYPE = 'WRITE'
               DISPLAY "  [probe] matched WRITE"
               MOVE BALANCE TO STORAGE-BALANCE
           ELSE
               DISPLAY "  [probe] NO MATCH"
           END-IF
           GOBACK.
COB

cobc -x main.cob operations.cob data.cob -o probe1 2>&1 | grep -viE 'fortify|previous definition'
printf '%s\n' 2 200 1 4 | timeout 5 ./probe1 | grep -aE 'probe|balance' | cat -v | sed 's/^/    /'
echo
echo "    ^@ is a NUL byte. Neither branch matches, and the original data.cob"
echo "    has no ELSE, so both calls return having done nothing."
echo

# ---------------------------------------------------------------------------
echo "=== Probe 2: does data.cob influence the balance at all? ==="
rm -f ./*.cob
cp "$REPO/main.cob" "$REPO/operations.cob" "$REPO/data.cob" .
sed -i "s/01  STORAGE-BALANCE    PIC 9(6)V99 VALUE 1000.00./01  STORAGE-BALANCE    PIC 9(6)V99 VALUE 7777.77./" data.cob
echo "Changed ONLY data.cob's opening balance:"
grep -n "STORAGE-BALANCE    PIC" data.cob | sed 's/^/    /'
grep -n "FINAL-BALANCE      PIC" operations.cob | sed 's/^/    /'
echo

cobc -x main.cob operations.cob data.cob -o probe2 2>&1 | grep -viE 'fortify|previous definition'
printf '%s\n' 1 4 | timeout 5 ./probe2 | grep -a 'balance' | sed 's/^/    /'
echo
echo "    007777.77 would mean DataProgram supplies the balance."
echo "    001000.00 means it does not - the value comes from operations.cob's"
echo "    own FINAL-BALANCE in WORKING-STORAGE, which is why it cannot survive"
echo "    a restart (finding L-09)."
