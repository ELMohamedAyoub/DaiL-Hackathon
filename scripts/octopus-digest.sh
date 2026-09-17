#!/usr/bin/env bash
# Generates a paste-ready trace of local work for the Octopus channel.
set -euo pipefail
echo "## Build trace since last Octopus update"
echo
echo "### Commits"
git log --oneline -10
echo
echo "### Files changed (uncommitted)"
git status --short
echo
echo "### Recent diff stat"
git diff --stat HEAD~"${1:-5}" 2>/dev/null || echo "(fewer than ${1:-5} commits)"
