#!/bin/bash

set -e

echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin $CI_REGISTRY

docker pull $CI_REGISTRY_IMAGE:$IMAGE_TAG

docker-compose -f docker-compose.prod.yml down

docker-compose -f docker-compose.prod.yml up -d

sleep 10
if curl -f http://localhost:8000/health; then
  echo "Deployment successful"
else
  echo "Health check failed, stopping containers"
  docker-compose -f docker-compose.prod.yml down
fi