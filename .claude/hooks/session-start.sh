#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# turbo-octo-system session start hook
# This script runs at the start of each Claude Code web session.
# Add dependency installation commands here as the project grows.
#
# Examples:
#   npm install          # Node.js
#   pip install -e .     # Python
#   bundle install       # Ruby
#   cargo build          # Rust

echo "Session start hook: environment ready."
