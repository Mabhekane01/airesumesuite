FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/backend ./apps/backend
COPY turbo.json ./

# Build the application
RUN pnpm turbo build --filter=@ai-job-suite/backend

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "turbo", "start", "--filter=@ai-job-suite/backend"]