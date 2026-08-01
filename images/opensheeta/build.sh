#!/bin/bash
set -e

# Build opensheeta image from local source
# Usage: ./build.sh [tag]

TAG=${1:-"ghcr.io/neuralj/opensheeta:latest"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="/Users/travis/Developer/repos/neuralj/opensheeta"

echo "Building opensheeta image: $TAG"
echo "Source: $SOURCE_DIR"

# Create temporary build context
BUILD_DIR=$(mktemp -d)
trap "rm -rf $BUILD_DIR" EXIT

# Copy Dockerfile
cp "$SCRIPT_DIR/Dockerfile" "$BUILD_DIR/"

# Copy source files (excluding node_modules, dist, .git, data)
rsync -a --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='data' --exclude='dashboard/node_modules' --exclude='dashboard/build' --exclude='dashboard/.svelte-kit' --exclude='frontend/node_modules' --exclude='frontend/dist' "$SOURCE_DIR/" "$BUILD_DIR/"

# Build the image
cd "$BUILD_DIR"
docker build -t "$TAG" .

echo ""
echo "Build complete: $TAG"
echo "Run with: docker run -p 8765:8765 -p 8766:8766 -v opensheeta-data:/data $TAG"
