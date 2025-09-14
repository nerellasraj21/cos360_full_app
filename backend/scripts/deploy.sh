#!/bin/bash

set -e

echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin $CI_REGISTRY

docker pull $CI_REGISTRY_IMAGE:$IMAGE_TAG

docker-compose -f docker-compose.prod.yml down

docker-compose -f docker-compose.prod.yml up -d

max_attempts=10
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if curl -f http://localhost:8000/health; then
    echo "Deployment successful"
    exit 0
  fi
  echo "Health check failed, attempt $((attempt + 1))/$max_attempts, retrying in 10 seconds..."
  sleep 10
  attempt=$((attempt + 1))
done

echo "Health check failed after $max_attempts attempts, stopping containers"
docker-compose -f docker-compose.prod.yml down