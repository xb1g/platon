#!/bin/bash
# Deploy/update the EC2 server from your local machine.
# Usage: ./scripts/deploy-ec2.sh [--pull-only]
#
# Required env vars (or create scripts/.env.deploy):
#   EC2_HOST     - e.g. ubuntu@1.2.3.4
#   EC2_KEY      - path to your .pem key file
#   EC2_REPO_PATH - (optional) path to repo on EC2, default: ~/platon

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_ENV="${SCRIPT_DIR}/.env.deploy"

# Load deploy config if it exists
if [[ -f "$DEPLOY_ENV" ]]; then
  set -a
  source "$DEPLOY_ENV"
  set +a
fi

if [[ -z "$EC2_HOST" ]] || [[ -z "$EC2_KEY" ]]; then
  echo "Error: EC2_HOST and EC2_KEY are required."
  echo ""
  echo "Option 1: Set env vars before running:"
  echo "  EC2_HOST=ubuntu@1.2.3.4 EC2_KEY=~/.ssh/my-key.pem ./scripts/deploy-ec2.sh"
  echo ""
  echo "Option 2: Create scripts/.env.deploy with:"
  echo "  EC2_HOST=ubuntu@1.2.3.4"
  echo "  EC2_KEY=/path/to/your-key.pem"
  echo "  EC2_REPO_PATH=~/platon   # optional, default is ~/platon"
  exit 1
fi

REPO_PATH="${EC2_REPO_PATH:-~/platon}"

echo "Deploying to $EC2_HOST (repo: $REPO_PATH)"
echo ""

if [[ "$1" == "--pull-only" ]]; then
  echo "Pull-only mode: fetching latest code..."
  ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_HOST" \
    "cd $REPO_PATH && git pull"
  echo "Done."
  exit 0
fi

echo "Pulling latest code and deploying..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_HOST" \
  "cd $REPO_PATH && git pull && ./scripts/deploy-local.sh"

echo ""
echo "Deployment complete."
