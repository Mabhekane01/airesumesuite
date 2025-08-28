# PNPM Migration Guide for Document Services

This guide covers the migration of `document-manager` and `document-sharing-service` from npm to pnpm, and their integration with the turbo monorepo setup.

## Overview

Both services have been updated to:

- Use pnpm as the package manager
- Work seamlessly with the turbo monorepo
- Support both independent operation and monorepo integration
- Use consistent Node.js version (>=20.0.0) and pnpm version (>=9.0.0)

## Changes Made

### 1. Package Manager Updates

#### document-manager

- Updated `engines` to require Node.js >=20.0.0 and pnpm >=9.0.0
- Added `packageManager: "pnpm@9.12.3"`
- Added `clean` and `type-check` scripts for turbo compatibility

#### document-sharing-service

- Updated main `package.json` to use pnpm commands
- Updated all sub-packages to use pnpm
- Added `type-check` scripts to all packages for turbo compatibility
- Added `clean` scripts for proper cleanup

### 2. Workspace Integration

#### Root Configuration

- Updated `pnpm-workspace.yaml` to include:
  - `document-manager`
  - `document-sharing-service`
  - `auth-service`
- Updated root `package.json` workspaces array
- Added service-specific scripts for development and building

#### Turbo Configuration

- Updated `turbo.json` to include:
  - `start` task for running services
  - `db:migrate`, `db:seed`, `db:reset` tasks for database operations
- All tasks properly configured for monorepo dependencies

## Migration Steps

### Step 1: Clean Existing Installation

```bash
# Remove existing node_modules and lock files
cd document-manager
rm -rf node_modules package-lock.json

cd ../document-sharing-service
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf packages/*/package-lock.json
```

### Step 2: Install Dependencies with PNPM

```bash
# Install dependencies for document-manager
cd document-manager
pnpm install

# Install dependencies for document-sharing-service
cd ../document-sharing-service
pnpm install
```

### Step 3: Verify Installation

```bash
# Test build for document-manager
cd document-manager
pnpm run build

# Test build for document-sharing-service
cd ../document-sharing-service
pnpm run build
```

## Usage Options

### Option 1: Independent Operation

Each service can run independently using its own pnpm commands:

```bash
# document-manager
cd document-manager
pnpm run dev
pnpm run build
pnpm run test

# document-sharing-service
cd document-sharing-service
pnpm run dev
pnpm run build
pnpm run test
```

### Option 2: Monorepo Integration

Use turbo commands from the root directory:

```bash
# Development
pnpm run dev:doc-manager      # Start document-manager in dev mode
pnpm run dev:doc-sharing      # Start document-sharing-service in dev mode
pnpm run dev:auth            # Start auth-service in dev mode

# Building
pnpm run build:doc-manager    # Build document-manager
pnpm run build:doc-sharing    # Build document-sharing-service
pnpm run build:auth          # Build auth-service

# All services
pnpm run build               # Build all services
pnpm run dev                 # Start all services in dev mode
pnpm run lint                # Lint all services
pnpm run test                # Test all services
```

## Service-Specific Commands

### document-manager

```bash
pnpm run dev                 # Development server
pnpm run build               # Build TypeScript
pnpm run start               # Production server
pnpm run test                # Run tests
pnpm run lint                # Lint code
pnpm run db:migrate          # Run database migrations
pnpm run db:seed             # Seed database
pnpm run db:reset            # Reset database
pnpm run clean               # Clean build artifacts
pnpm run type-check          # Type checking
```

### document-sharing-service

```bash
# Main service
pnpm run dev                 # Start all sub-services
pnpm run build               # Build all sub-services
pnpm run test                # Test all sub-services
pnpm run lint                # Lint all sub-services

# Individual sub-services
pnpm run dev:api             # API Gateway only
pnpm run dev:analytics       # Analytics Engine only
pnpm run dev:file-processor  # File Processor only
pnpm run dev:notifications   # Notification Service only

# Database operations
pnpm run db:migrate          # Run migrations
pnpm run db:seed             # Seed database
pnpm run db:reset            # Reset database

# Utility
pnpm run clean               # Clean all artifacts
pnpm run type-check          # Type check all packages
```

## Benefits of the New Setup

### 1. Monorepo Integration

- Shared dependencies and consistent versions
- Unified build and development workflows
- Cross-service development and testing

### 2. Performance

- pnpm's efficient dependency resolution
- Turbo's intelligent caching and parallel execution
- Faster installs and builds

### 3. Developer Experience

- Single command to start all services
- Consistent tooling across services
- Easy cross-service development

### 4. Scalability

- Easy to add new services
- Centralized configuration
- Efficient CI/CD pipelines

## Troubleshooting

### Common Issues

#### 1. pnpm not found

```bash
npm install -g pnpm
# or
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

#### 2. Workspace dependencies not resolving

```bash
# Clear pnpm store and reinstall
pnpm store prune
pnpm install --force
```

#### 3. TypeScript compilation errors

```bash
# Check if all dependencies are properly installed
pnpm run type-check

# Rebuild node_modules
rm -rf node_modules
pnpm install
```

#### 4. Turbo cache issues

```bash
# Clear turbo cache
pnpm run clean
turbo clean
```

### Getting Help

If you encounter issues:

1. Check the service-specific logs
2. Verify pnpm and Node.js versions
3. Ensure all dependencies are properly installed
4. Check the turbo configuration
5. Review the workspace setup

## Next Steps

After successful migration:

1. Update CI/CD pipelines to use pnpm
2. Update Docker configurations if needed
3. Train team members on new commands
4. Consider adding more turbo optimizations
5. Monitor build and development performance

## Conclusion

The migration to pnpm and integration with turbo provides:

- Better dependency management
- Improved build performance
- Unified development experience
- Scalable monorepo architecture

Both services now work seamlessly within the monorepo while maintaining their ability to run independently when needed.
