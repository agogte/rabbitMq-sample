#!/bin/bash
# run.sh - one-command bring-up for the whole stack (RabbitMQ + API + subscriber).
set -e

WITH_LOAD_TEST=false
for arg in "$@"; do
  case "$arg" in
    --with-load-test) WITH_LOAD_TEST=true ;;
  esac
done

echo "Building and starting RabbitMQ + Tax API stack..."
docker compose up --build -d

echo "Waiting for the API to report healthy..."
until curl -sf http://localhost:3000/health >/dev/null 2>&1; do
  sleep 2
done

echo ""
echo "Stack is up:"
echo "  API:                 http://localhost:3000"
echo "  Swagger UI:           http://localhost:3000/api-docs"
echo "  RabbitMQ Dashboard:   http://localhost:15672  (guest/guest)"
echo ""
echo "Dashboard tips:"
echo "  - Overview tab -> 'Message rates' chart shows global publish/deliver/ack throughput."
echo "  - Queues tab -> taxSubmissions and taxSubmissions.dlq each have their own rate charts."
echo ""
echo "Try the DLQ path manually:"
echo '  curl -X POST http://localhost:3000/submit -H "Content-Type: application/json" \'
echo '    -d "{\"userId\":\"demo\",\"taxData\":\"x\",\"simulateFailure\":true}"'

if [ "$WITH_LOAD_TEST" = true ]; then
  echo ""
  echo "Running load test (baseline -> surge) to generate traffic for the dashboard charts..."
  npm run load-test
else
  echo ""
  echo "Run './run.sh --with-load-test' (or 'npm run load-test') to generate traffic and watch the dashboard charts update live."
fi
