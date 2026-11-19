# ==============================================================================
# CREWBOARD FRONTEND DOCKERFILE
# Multi-stage production build: Node 20 build stage -> Hardened Nginx runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React + Vite SPA
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies reproducibly using package-lock.json
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Server
# ------------------------------------------------------------------------------
FROM nginx:alpine

# Remove default Nginx welcome assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy hardened Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check for Nginx web server
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=5s \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
