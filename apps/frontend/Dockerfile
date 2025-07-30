FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/frontend ./apps/frontend
COPY turbo.json ./

# Expose port
EXPOSE 5173

# Start development server
CMD ["pnpm", "turbo", "dev", "--filter=@ai-job-suite/frontend"]