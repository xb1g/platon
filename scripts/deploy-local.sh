#!/bin/bash
# Deployment script for the single EC2 instance

set -e

echo "Starting infrastructure (Postgres, Neo4j, Redis)..."
docker compose up -d

echo "Installing Node dependencies..."
pnpm install

echo "Building applications..."
pnpm build

echo "Starting applications with PM2..."
# Stop existing processes if they exist
pm2 stop all || true
pm2 delete all || true

# Start API
pm2 start pnpm --name "memory-api" -- --filter @memory/api start
# Start Worker
pm2 start pnpm --name "memory-worker" -- --filter @memory/worker start
# Start Web Dashboard
pm2 start pnpm --name "memory-web" -- --filter @memory/web start

pm2 save
pm2 startup | grep "sudo" | bash || true

echo "Deployment complete! Apps are running via PM2."
pm2 status
