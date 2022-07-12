#!/usr/bin/env bash

source $DOCKER_COMPOSE_ENV
cd $VM_TARGET_DIR
docker-compose pull
docker-compose down
docker-compose -p $DOCKER_COMPOSE_PREFIX up -d