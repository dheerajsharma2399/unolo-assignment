#!/bin/sh

# Start Backend in background
cd /app/backend
# Ensure data directory exists for SQLite
mkdir -p data
npm start &

# Wait for backend to be ready
echo "Waiting for backend to start..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s http://localhost:9007/api/health > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "Backend failed to start within timeout"
        exit 1
    fi
    echo "Backend not ready yet, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

echo "Backend is ready, starting Nginx..."

# Start Nginx in foreground
nginx -g "daemon off;"