#!/bin/sh

# Force remove containers by name to prevent conflicts across project names
docker rm -f unolo_backend unolo_frontend || true

# 1. Stop and remove any existing containers, networks, and volumes defined in the compose file.
# This prevents the "container name already in use" error.
docker compose down

# 2. Build images from scratch (no cache) and pull latest base images
docker compose build --no-cache --pull

# 3. Start containers in detached mode. --force-recreate is no longer needed as `down` handles cleanup.
docker compose up -d --remove-orphans