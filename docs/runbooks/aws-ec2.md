# AWS EC2 Deployment Guide (Single Instance MVP)

This guide covers deploying the Agent Memory Platform to a single AWS EC2 instance. This approach runs the databases (Postgres, Neo4j, Redis) in Docker and the Node.js applications (API, Worker, Web) via PM2.

## 1. Launch the EC2 Instance

1. Go to the **EC2 Dashboard** in the AWS Console.
2. Click **Launch Instance**.
3. **Name:** `agent-memory-platform-mvp`
4. **AMI:** Select **Ubuntu Server 24.04 LTS** (or 22.04).
5. **Instance Type:** Select **t3.medium** (2 vCPU, 4GB RAM) or larger.
6. **Key Pair:** Select an existing key pair or create a new one to SSH into the instance.
7. **Network Settings:**
   - Allow SSH traffic from your IP.
   - Allow HTTP traffic from the internet (Port 80).
   - Allow Custom TCP traffic on Port 3000 (Web Dashboard) and Port 3001 (API) if you want direct access before setting up a reverse proxy.
8. **Storage:** Increase the root volume to **30 GB** (gp3).
9. Click **Launch Instance**.

## 2. Connect and Setup

SSH into your new instance:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-public-ip>
```

### Link the repo to GitHub

The EC2 server needs access to your GitHub repo. Choose one:

**Option A: SSH deploy key (recommended)**

1. On the EC2 server, generate a key:
   ```bash
   ssh-keygen -t ed25519 -C "ec2-deploy" -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub
   ```

2. In GitHub: repo → **Settings** → **Deploy keys** → **Add deploy key**. Paste the public key. Enable "Allow write access" only if you need to push from EC2.

3. Clone the repo:
   ```bash
   ./scripts/setup-ec2-git.sh
   ```
   Or manually: `git clone git@github.com:xb1g/platon.git ~/platon`

**Option B: HTTPS with Personal Access Token**

1. Create a [GitHub PAT](https://github.com/settings/tokens) with `repo` scope.

2. Clone using the token:
   ```bash
   git clone https://<YOUR_PAT>@github.com/xb1g/platon.git ~/platon
   ```
   Or set `REPO_URL` and run the script:
   ```bash
   REPO_URL="https://<YOUR_PAT>@github.com/xb1g/platon.git" ./scripts/setup-ec2-git.sh
   ```

Run the setup script to install Docker, Node.js, pnpm, and PM2:
```bash
./scripts/setup-ec2.sh
```

**Important:** Log out (`exit`) and SSH back in so the Docker group permissions take effect.

## 3. Configure Environment

Copy the example environment file and fill in your production values (especially Nevermined keys and secure passwords):
```bash
cp .env.example .env
nano .env
```

## 4. Deploy

### Initial deploy (on EC2)

Run the deployment script to start the databases via Docker and the apps via PM2:
```bash
./scripts/deploy-local.sh
```

### Update from your local machine

To pull latest code and redeploy without SSHing in manually:

1. Copy `scripts/.env.deploy.example` to `scripts/.env.deploy` and set:
   - `EC2_HOST` – e.g. `ubuntu@1.2.3.4`
   - `EC2_KEY` – path to your `.pem` key
   - `EC2_REPO_PATH` – path to the repo on EC2 (default: `~/platon`)

2. Run:
```bash
./scripts/deploy-ec2.sh
```

Or with env vars inline:
```bash
EC2_HOST=ubuntu@1.2.3.4 EC2_KEY=~/.ssh/my-key.pem ./scripts/deploy-ec2.sh
```

Use `--pull-only` to only pull code without redeploying:
```bash
./scripts/deploy-ec2.sh --pull-only
```

## 5. (Optional) Setup Nginx Reverse Proxy

To serve the web dashboard on port 80 (standard HTTP), configure Nginx:

```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the contents with:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

Your platform is now live at your EC2 instance's Public IPv4 address!
