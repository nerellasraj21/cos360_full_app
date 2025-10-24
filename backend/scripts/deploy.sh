#!/bin/bash
set -e

echo "=== COS360 Deployment Script ==="
echo "Registry: $CI_REGISTRY"
echo "Image: $CI_REGISTRY_IMAGE:$IMAGE_TAG"

# Login to GitLab Container Registry
echo "Logging into container registry..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin "$CI_REGISTRY"

# Pull the latest image
echo "Pulling Docker image..."
docker pull "$CI_REGISTRY_IMAGE:$IMAGE_TAG"

# Stop and remove existing containers
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Start the application
echo "Starting application..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for application to be ready
echo "Waiting for application to start..."
sleep 10

# Check if container is running
if docker ps | grep -q cos360_web; then
    echo "✓ Container is running"

    # Test health endpoint
    echo "Testing health endpoint..."
    for i in {1..30}; do
        if curl -f http://localhost:8000/health 2>/dev/null; then
            echo "✓ Health check passed"
            echo "=== Deployment successful ==="
            exit 0
        fi
        echo "Health check attempt $i/30 failed, waiting..."
        sleep 2
    done

    echo "✗ Health check failed after 60 seconds"
    echo "=== Checking container logs ==="
    docker-compose -f docker-compose.prod.yml logs --tail=50
    docker-compose -f docker-compose.prod.yml down
    exit 1
else
    echo "✗ Container failed to start"
    echo "=== Checking container logs ==="
    docker-compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi
