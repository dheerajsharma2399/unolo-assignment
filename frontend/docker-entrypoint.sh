#!/bin/sh

# Wait for backend to be available
echo "Waiting for backend to be available..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if nc -z backend 9007 2>/dev/null; then
        echo "Backend is available!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts - waiting for backend..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "Warning: Backend not available after $max_attempts attempts, starting anyway..."
fi

# Start nginx
exec nginx -g 'daemon off;'
