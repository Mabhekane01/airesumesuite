# Multi-stage build for production
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/frontend ./apps/frontend

# Build stage
FROM base AS build

# Build-time environment variables for Vite
ARG VITE_NODE_ENV=production
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_API_BASE_URL
ARG VITE_APP_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_GA_TRACKING_ID
ARG VITE_PAYSTACK_PUBLISHABLE_KEY
ARG VITE_ENABLE_AI_FEATURES
ARG VITE_ENABLE_PAYMENT_PROCESSING
ARG VITE_ENABLE_ANALYTICS
ARG VITE_ENABLE_RECAPTCHA
ARG VITE_ENABLE_GOOGLE_AUTH
ARG VITE_DEBUG_MODE
ARG VITE_LOG_LEVEL
ARG VITE_SENTRY_DSN
ARG VITE_ENABLE_PWA

# Make ARGs available as ENV variables for Vite build
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY
ENV VITE_GA_TRACKING_ID=$VITE_GA_TRACKING_ID
ENV VITE_PAYSTACK_PUBLISHABLE_KEY=$VITE_PAYSTACK_PUBLISHABLE_KEY
ENV VITE_ENABLE_AI_FEATURES=$VITE_ENABLE_AI_FEATURES
ENV VITE_ENABLE_PAYMENT_PROCESSING=$VITE_ENABLE_PAYMENT_PROCESSING
ENV VITE_ENABLE_ANALYTICS=$VITE_ENABLE_ANALYTICS
ENV VITE_ENABLE_RECAPTCHA=$VITE_ENABLE_RECAPTCHA
ENV VITE_ENABLE_GOOGLE_AUTH=$VITE_ENABLE_GOOGLE_AUTH
ENV VITE_DEBUG_MODE=$VITE_DEBUG_MODE
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA

# Build the application
WORKDIR /app/apps/frontend
RUN pnpm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built assets from build stage
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx user
RUN addgroup -g 1001 -S nginx || true
RUN adduser -S nginx -u 1001 -G nginx || true

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chown -R nginx:nginx /var/cache/nginx
RUN chown -R nginx:nginx /var/log/nginx
RUN chown -R nginx:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]