#!/usr/bin/env bash
# WheelCheck browser-harness test runner
# Launches Chrome with remote debugging, runs tests, then cleans up.
#
# Usage:
#   ./tools/run-harness-tests.sh              # run all tests
#   ./tools/run-harness-tests.sh --keep-chrome # keep Chrome open after tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$SCRIPT_DIR/venv"
CHROME_DATA="/tmp/wheelcheck-harness"
CHROME_PORT=9222
CHROME_PID_FILE="/tmp/wheelcheck-chrome.pid"

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

info()  { echo -e "${GREEN}▶${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
error() { echo -e "${RED}✖${NC}  $*"; }

# ── Find Chrome ───────────────────────────────────────────────────────────────
find_chrome() {
    for p in \
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        "/Applications/Chromium.app/Contents/MacOS/Chromium" \
        "$(which chromium-browser 2>/dev/null)" \
        "$(which google-chrome 2>/dev/null)"; do
        [ -x "$p" ] && echo "$p" && return
    done
    error "Chrome/Chromium not found. Install Google Chrome."
    exit 1
}

# ── Check if Chrome debug port is ready ──────────────────────────────────────
wait_for_chrome() {
    local retries=15
    while [ $retries -gt 0 ]; do
        if curl -sf "http://127.0.0.1:$CHROME_PORT/json/version" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        retries=$((retries - 1))
    done
    return 1
}

# ── Start Chrome ──────────────────────────────────────────────────────────────
start_chrome() {
    local CHROME
    CHROME=$(find_chrome)

    # Kill any leftover Chrome on our debug port
    local old_pid
    old_pid=$(lsof -ti:"$CHROME_PORT" 2>/dev/null || true)
    if [ -n "$old_pid" ]; then
        warn "Killing existing process on port $CHROME_PORT (PID $old_pid)"
        kill "$old_pid" 2>/dev/null || true
        sleep 2
    fi

    info "Starting Chrome with remote debugging on port $CHROME_PORT..."
    rm -rf "$CHROME_DATA"
    mkdir -p "$CHROME_DATA"

    # Launch Chrome fully detached (setsid + redirect all FDs)
    setsid "$CHROME" \
        --remote-debugging-port="$CHROME_PORT" \
        --user-data-dir="$CHROME_DATA" \
        --headless=new \
        --no-first-run \
        --no-default-browser-check \
        --disable-translate \
        --disable-background-networking \
        --disable-sync \
        --disable-extensions \
        about:blank \
        >/tmp/wheelcheck-chrome.log 2>&1 &
    echo $! > "$CHROME_PID_FILE"

    if wait_for_chrome; then
        local browser
        browser=$(curl -sf "http://127.0.0.1:$CHROME_PORT/json/version" | python3 -c "import json,sys; print(json.load(sys.stdin).get('Browser','?')[:25])" 2>/dev/null)
        info "Chrome ready: $browser"
    else
        error "Chrome failed to start. Check /tmp/wheelcheck-chrome.log"
        cat /tmp/wheelcheck-chrome.log | head -20
        exit 1
    fi
}

# ── Stop Chrome ───────────────────────────────────────────────────────────────
stop_chrome() {
    if [ -f "$CHROME_PID_FILE" ]; then
        local pid
        pid=$(cat "$CHROME_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            info "Stopping Chrome (PID $pid)..."
            kill "$pid" 2>/dev/null || true
        fi
        rm -f "$CHROME_PID_FILE"
    fi
}

# ── Activate venv ─────────────────────────────────────────────────────────────
activate_venv() {
    if [ ! -f "$VENV/bin/activate" ]; then
        error "Virtual environment not found at $VENV"
        echo "Run: python3 -m venv tools/venv && source tools/venv/bin/activate && pip install -r tools/requirements.txt && pip install -e tools/browser-harness"
        exit 1
    fi
    # shellcheck disable=SC1091
    source "$VENV/bin/activate"
}

# ── Main ──────────────────────────────────────────────────────────────────────
KEEP_CHROME=false
for arg in "$@"; do
    [ "$arg" = "--keep-chrome" ] && KEEP_CHROME=true
done

activate_venv
start_chrome

export BU_CDP_URL="http://127.0.0.1:$CHROME_PORT"

info "Running browser-harness tests..."
echo ""

set +e
python "$SCRIPT_DIR/../frontend/tests/browser-harness/test_leaflet_map.py"
EXIT_CODE=$?
set -e

echo ""
if $KEEP_CHROME; then
    warn "Chrome kept running on port $CHROME_PORT (--keep-chrome). Stop with: kill $(cat $CHROME_PID_FILE 2>/dev/null || echo '?')"
else
    stop_chrome
fi

exit $EXIT_CODE
