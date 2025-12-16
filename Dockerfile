# Build stage - Game
FROM node:20-alpine AS game-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Build stage - API
FROM node:20-alpine AS api-builder
WORKDIR /api
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build
# Remove dev dependencies after build
RUN npm prune --production

# Production stage
FROM node:20-alpine

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Create directories
RUN mkdir -p /run/nginx /data

# Copy game static files
COPY --from=game-builder /app/dist /usr/share/nginx/html

# Copy API
COPY --from=api-builder /api/dist /api/dist
COPY --from=api-builder /api/node_modules /api/node_modules
COPY --from=api-builder /api/package.json /api/

# Config files
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# Ensure data directory is writable
RUN chmod 777 /data

EXPOSE 8080

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
