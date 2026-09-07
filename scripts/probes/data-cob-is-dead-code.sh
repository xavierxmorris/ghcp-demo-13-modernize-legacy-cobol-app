#!/usr/bin/env bash
# Reproducible evidence for finding L-10: data.cob never executes either of its
# branches, so the balance is held by operations.cob's own WORKING-STORAGE.
#
#   bash scripts/probes/data-cob-is-dead-code.sh
#
# Requires GnuCOBOL. Writes only to a temporary directory; the repository's
# .cob files are copied, never modified.
set -euo pipefail

cd "$(dirname "$0")/../.."
REPO="$PWD"

if ! command -v cobc >/dev/null 2>&1; then
  echo "GnuCOBOL (cobc) is not installed. See scripts/build-cobol.sh." >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

compile_probe() {
    if ! cobc "$@" > "$WORK/compiler.log" 2>&1; then
        cat "$WORK/compiler.log" >&2
        return 1
    fi
    sed \
        -e '/^<command-line>: warning: "_FORTIFY_SOURCE" redefined$/d' \
        -e '/^<command-line>: note: this is the location of the previous definition$/d' \
        "$WORK/compiler.log" >&2
}

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

compile_probe -x main.cob operations.cob data.cob -o probe1
printf '%s\n' 2 200 1 4 | timeout 5 ./probe1 > probe1.out
if [[ "$(awk '/\[probe\] NO MATCH/ { n++ } END { print n+0 }' probe1.out)" -ne 3 ]] \
    || grep -aq '\[probe\] matched' probe1.out; then
    echo 'FAIL: DataProgram branch behavior differs from the recorded L-10 finding.' >&2
    cat -v probe1.out >&2
    exit 1
fi
grep -aE 'probe|balance' probe1.out | cat -v | sed 's/^/    /'
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

compile_probe -x main.cob operations.cob data.cob -o probe2
printf '%s\n' 1 4 | timeout 5 ./probe2 > probe2.out
if ! grep -aFq 'Current balance: 001000.00' probe2.out; then
    echo 'FAIL: The balance owner differs from the recorded L-10 finding.' >&2
    cat -v probe2.out >&2
    exit 1
fi
grep -a 'balance' probe2.out | sed 's/^/    /'
echo
echo "    007777.77 would mean DataProgram supplies the balance."
echo "    001000.00 means it does not - the value comes from operations.cob's"
echo "    own FINAL-BALANCE in WORKING-STORAGE, which is why it cannot survive"
echo "    a restart (finding L-09)."
echo
echo 'PASS: L-10 branch and balance-owner assertions hold; original source files were not modified.'
