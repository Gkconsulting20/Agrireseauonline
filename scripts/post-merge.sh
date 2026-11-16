#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Install exactly the committed dependencies; never migrate or seed the database.
npm ci --no-audit --no-fund
node --check server.js
node --check public/app.js
node --check public/reference-data.js
