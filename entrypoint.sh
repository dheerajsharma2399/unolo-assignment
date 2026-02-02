#!/bin/sh

# Start Backend in background
cd /app/backend
# Ensure data directory exists for SQLite
mkdir -p data
npm start &

# Start Nginx in foreground
nginx -g "daemon off;"