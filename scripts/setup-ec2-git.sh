#!/bin/bash
# Run this ON THE EC2 SERVER to clone or link the platon repo to GitHub.
# SSH in first: ssh -i big-ec2.pem ubuntu@ec2-54-151-1-154.us-west-1.compute.amazonaws.com
#
# For SSH: generate a deploy key first, add to GitHub, then run this script.
# For HTTPS: REPO_URL="https://<PAT>@github.com/xb1g/platon.git" ./scripts/setup-ec2-git.sh

set -e

REPO_URL="${REPO_URL:-git@github.com:xb1g/platon.git}"
TARGET_DIR="${TARGET_DIR:-/home/ubuntu/platon}"

echo "Setting up platon repo at $TARGET_DIR"
echo ""

# Ensure GitHub is in known_hosts
mkdir -p ~/.ssh
ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts 2>/dev/null || true

# Option A: Directory doesn't exist or is empty - clone fresh
if [[ ! -d "$TARGET_DIR" ]] || [[ -z "$(ls -A $TARGET_DIR 2>/dev/null)" ]]; then
  echo "Cloning repo..."
  mkdir -p "$(dirname $TARGET_DIR)"
  git clone "$REPO_URL" "$TARGET_DIR"
  echo "Cloned successfully."
  exit 0
fi

# Option B: Directory exists - check if it's a git repo
if [[ -d "$TARGET_DIR/.git" ]]; then
  echo "Git repo already exists. Adding remote if missing..."
  cd "$TARGET_DIR"
  if ! git remote get-url origin 2>/dev/null; then
    git remote add origin "$REPO_URL"
  fi
  echo "Fetching..."
  git fetch origin
  git branch -u origin/main main 2>/dev/null || git branch -u origin/master master 2>/dev/null || true
  echo "Done."
  exit 0
fi

# Option C: Directory has files but no .git - init and pull
echo "Directory exists but is not a git repo."
echo "Initializing git and linking to $REPO_URL..."
cd "$TARGET_DIR"
git init
git remote add origin "$REPO_URL"
git fetch origin
git checkout -b main origin/main 2>/dev/null || git checkout -b master origin/master 2>/dev/null || true
echo "Done."
