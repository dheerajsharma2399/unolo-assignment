# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Setup Backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++
RUN npm install --production
COPY backend/ .

# Stage 3: Final Image (Node 18 + Nginx)
# Use node:18-alpine to ensure runtime matches build time (ABI compatibility)
FROM node:18-alpine
WORKDIR /app

# Install Nginx
RUN apk add --no-cache nginx && mkdir -p /run/nginx

# Copy Backend
COPY --from=backend-builder /app/backend /app/backend

# Copy Frontend Build to Nginx web root
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy Configs
# Alpine Nginx package uses http.d, not conf.d
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY entrypoint.sh /entrypoint.sh

# Fix line endings (for Windows hosts) and permissions
RUN sed -i 's/\r$//' /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Environment Variables
ENV PORT=3001
ENV NODE_ENV=production

# Expose Nginx Port
EXPOSE 80

# Start both services
ENTRYPOINT ["/entrypoint.sh"]