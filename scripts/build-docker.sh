#!/bin/bash
# Docker Build Script for AI Job Suite
# Usage: ./scripts/build-docker.sh [base|production|all]

set -e

# Configuration
REGISTRY="ghcr.io"
USERNAME="${GITHUB_REPOSITORY_OWNER:-your-username}"
BASE_IMAGE="${REGISTRY}/${USERNAME}/ai-job-suite-latex-base"
PROD_IMAGE="${REGISTRY}/${USERNAME}/ai-job-suite"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker first."
    exit 1
fi

# Build base image
build_base() {
    log "Building LaTeX base image..."
    log "This may take 10-15 minutes on first build..."
    
    docker build \
        -f docker/Dockerfile.latex-base \
        -t ${BASE_IMAGE}:latest \
        -t ${BASE_IMAGE}:$(date +%Y%m%d) \
        .
    
    log "Base image built successfully!"
    log "Image: ${BASE_IMAGE}:latest"
    
    # Test LaTeX installation
    log "Testing LaTeX installation..."
    if docker run --rm ${BASE_IMAGE}:latest latex --version > /dev/null 2>&1; then
        log "✅ LaTeX test passed!"
    else
        error "❌ LaTeX test failed!"
        return 1
    fi
}

# Build production image  
build_production() {
    log "Building production image..."
    
    # Update Dockerfile with correct base image reference
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|your-username/ai-job-suite-latex-base:latest|${BASE_IMAGE}:latest|g" Dockerfile.production
    else
        # Linux
        sed -i "s|your-username/ai-job-suite-latex-base:latest|${BASE_IMAGE}:latest|g" Dockerfile.production
    fi
    
    docker build \
        -f Dockerfile.production \
        -t ${PROD_IMAGE}:latest \
        -t ${PROD_IMAGE}:$(date +%Y%m%d) \
        .
    
    log "Production image built successfully!"
    log "Image: ${PROD_IMAGE}:latest"
    
    # Test production image
    log "Testing production image..."
    if docker run --rm -d --name test-app -p 3001:3001 ${PROD_IMAGE}:latest > /dev/null; then
        sleep 5
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log "✅ Production image test passed!"
        else
            warn "⚠️  Health check failed (may need environment variables)"
        fi
        docker stop test-app > /dev/null 2>&1 || true
    else
        error "❌ Production image test failed!"
        return 1
    fi
}

# Push images to registry
push_images() {
    log "Pushing images to registry..."
    
    # Login to registry (assuming GitHub token is available)
    if [ ! -z "$GITHUB_TOKEN" ]; then
        echo $GITHUB_TOKEN | docker login ${REGISTRY} -u ${USERNAME} --password-stdin
    else
        warn "No GITHUB_TOKEN found. You may need to login manually:"
        echo "  docker login ${REGISTRY}"
    fi
    
    if docker image inspect ${BASE_IMAGE}:latest > /dev/null 2>&1; then
        log "Pushing base image..."
        docker push ${BASE_IMAGE}:latest
        docker push ${BASE_IMAGE}:$(date +%Y%m%d)
    fi
    
    if docker image inspect ${PROD_IMAGE}:latest > /dev/null 2>&1; then
        log "Pushing production image..."
        docker push ${PROD_IMAGE}:latest  
        docker push ${PROD_IMAGE}:$(date +%Y%m%d)
    fi
    
    log "✅ Images pushed successfully!"
}

# Show image sizes
show_info() {
    log "Image Information:"
    echo ""
    docker images | grep -E "(${USERNAME}/ai-job-suite|SIZE)" | head -10
    echo ""
    
    log "Quick Start Commands:"
    echo -e "${BLUE}# Run production image locally:${NC}"
    echo "docker run --rm -p 3001:3001 -e NODE_ENV=production ${PROD_IMAGE}:latest"
    echo ""
    echo -e "${BLUE}# Deploy to Render using image URL:${NC}"
    echo "image: ${PROD_IMAGE}:latest"
}

# Main logic
case "${1:-all}" in
    base)
        build_base
        ;;
    production|prod)
        build_production
        ;;
    push)
        push_images
        ;;
    all)
        build_base
        build_production
        ;;
    info)
        show_info
        ;;
    *)
        echo "Usage: $0 [base|production|push|all|info]"
        echo ""
        echo "Commands:"
        echo "  base       - Build LaTeX base image only"
        echo "  production - Build production image only"  
        echo "  push       - Push images to registry"
        echo "  all        - Build both images (default)"
        echo "  info       - Show image information"
        exit 1
        ;;
esac

if [[ "${1:-all}" != "info" ]] && [[ "${1:-all}" != "push" ]]; then
    show_info
fi

log "Build process completed! 🚀"