# Multi-stage build for production
# Use Puppeteer base image that includes Chrome
FROM ghcr.io/puppeteer/puppeteer:latest AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies (Puppeteer will download Chrome - needed for PDF generation)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/backend ./apps/backend

# Build stage
FROM base AS build

# Build the application with skipLibCheck
WORKDIR /app/apps/backend
RUN pnpm run build:prod

# Production stage
FROM ghcr.io/puppeteer/puppeteer:latest AS production

# Install dumb-init for proper signal handling (Ubuntu-based image)
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Use existing pptruser from Puppeteer image (safer than creating new user)

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install only production dependencies (Puppeteer Chrome needed for production)
RUN pnpm install --frozen-lockfile --prod

# Copy built application from build stage
COPY --from=build --chown=pptruser:pptruser /app/apps/backend/dist ./apps/backend/dist

# Create uploads directory (don't copy existing uploads)
RUN mkdir -p ./apps/backend/uploads && chown -R pptruser:pptruser ./apps/backend/uploads

# Switch to non-root user (pptruser exists in Puppeteer image)
USER pptruser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/backend/dist/index.js"]