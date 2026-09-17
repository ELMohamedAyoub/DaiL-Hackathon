#!/usr/bin/env bash
# Wrapper for codex exec that always closes stdin. Without this, codex
# sometimes blocks on "Reading additional input from stdin..." forever
# in a backgrounded shell where stdin never reaches EOF on its own.
# Usage: ./scripts/codex-run.sh <prompt_file> <log_file>
set -euo pipefail
PROMPT_FILE="$1"
LOG_FILE="$2"
cd "$(dirname "$0")/.."
codex exec -s workspace-write --skip-git-repo-check "$(cat "$PROMPT_FILE")" < /dev/null > "$LOG_FILE" 2>&1
