#!/bin/sh

# 1. Build images from scratch (no cache) and pull latest base images
docker compose build --no-cache --pull

# 2. Start containers (recreate them to ensure new config applies)
docker compose up -d --force-recreate --remove-orphans