#!/bin/bash
# EC2 Setup Script for Agent Memory Platform MVP
# Run this script on a fresh Ubuntu 22.04/24.04 EC2 instance (t3.medium recommended)

set -e

echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

echo "Installing dependencies..."
sudo apt-get install -y curl git unzip build-essential nginx

echo "Installing Docker & Docker Compose..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Installing pnpm and pm2..."
sudo npm install -g pnpm pm2

echo "Setup complete! Please log out and log back in for Docker group changes to take effect."
echo "Then, clone your repository and run scripts/deploy-local.sh"
