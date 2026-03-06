#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PIDS=()

start_service() {
  local name="$1"
  local path="$2"
  node "$path" &
  echo "started: $name"
  PIDS+=("$!")
}

cleanup() {
  echo
  echo "Stopping all services..."
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait || true
  echo "All services stopped."
}

trap cleanup EXIT INT TERM

start_service "auth" "services/auth/src/index.js"
start_service "catalog" "services/catalog/src/index.js"
start_service "cart" "services/cart/src/index.js"
start_service "order" "services/order/src/index.js"
start_service "payment" "services/payment/src/index.js"
start_service "notification" "services/notification/src/index.js"
start_service "gateway" "services/gateway/src/index.js"

echo "All services started. Open http://localhost:3000"
echo "Press Ctrl+C to stop everything."
wait
