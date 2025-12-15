# VPS Deployment Guide for Nextcloud MCP

This guide explains how to deploy the Nextcloud MCP server on your VPS at `mcp.techmavie.digital/nextcloud`.

## Prerequisites

- VPS with Ubuntu/Debian
- Docker and Docker Compose installed
- Nginx installed
- Domain `mcp.techmavie.digital` pointing to your VPS IP
- SSL certificate (via Certbot/Let's Encrypt)
- Nextcloud instance with credentials

## Architecture

```
Client (Claude, Cursor, etc.)
    ↓ HTTPS
https://mcp.techmavie.digital/nextcloud/mcp
    ↓
Nginx (SSL termination + reverse proxy)
    ↓ HTTP
Docker Container (port 8085 → 8080)
    ↓
Your Nextcloud Instance
```

## Deployment Steps

### 1. SSH into your VPS

```bash
ssh root@your-vps-ip
```

### 2. Create directory for the MCP server

```bash
mkdir -p /opt/mcp-servers/nextcloud
cd /opt/mcp-servers/nextcloud
```

### 3. Clone the repository

```bash
git clone https://github.com/hithereiamaliff/mcp-nextcloud.git .
```

### 4. Create environment file

```bash
cp .env.sample .env
nano .env
```

Add your Nextcloud credentials:
```env
NEXTCLOUD_HOST=https://your-nextcloud-instance.com
NEXTCLOUD_USERNAME=your_username
NEXTCLOUD_PASSWORD=your_app_password
```

> **Note:** It's recommended to use an App Password instead of your main password. Generate one in Nextcloud: Settings → Security → Devices & sessions → Create new app password.

### 5. Build and start the Docker container

```bash
docker compose up -d --build
```

### 6. Verify the container is running

```bash
docker compose ps
docker compose logs -f
```

### 7. Test the health endpoint

```bash
curl http://localhost:8085/health
```

### 8. Configure Nginx

Add the location block from `deploy/nginx-mcp.conf` to your existing nginx config for `mcp.techmavie.digital`:

```bash
# Edit your existing nginx config
sudo nano /etc/nginx/sites-available/mcp.techmavie.digital

# Add the location block from deploy/nginx-mcp.conf inside the server block
# Make sure it's at the same level as other location blocks (not nested)

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 9. Test the MCP endpoint

```bash
# Test health endpoint through nginx
curl https://mcp.techmavie.digital/nextcloud/health

# Test MCP endpoint
curl -X POST https://mcp.techmavie.digital/nextcloud/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Client Configuration

### For Claude Desktop / Cursor / Windsurf

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "nextcloud": {
      "transport": "streamable-http",
      "url": "https://mcp.techmavie.digital/nextcloud/mcp"
    }
  }
}
```

### With Credentials via Query Params (if not using .env)

```json
{
  "mcpServers": {
    "nextcloud": {
      "transport": "streamable-http",
      "url": "https://mcp.techmavie.digital/nextcloud/mcp?nextcloudHost=https://cloud.example.com&nextcloudUsername=user&nextcloudPassword=pass"
    }
  }
}
```

### For MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# Select "Streamable HTTP"
# Enter URL: https://mcp.techmavie.digital/nextcloud/mcp
```

## Management Commands

### View logs

```bash
cd /opt/mcp-servers/nextcloud
docker compose logs -f
```

### Restart the server

```bash
docker compose restart
```

### Update to latest version

```bash
git pull origin main
docker compose up -d --build
```

### Stop the server

```bash
docker compose down
```

## GitHub Actions Auto-Deploy

The repository includes a GitHub Actions workflow (`.github/workflows/deploy-vps.yml`) that automatically deploys to your VPS when you push to the `main` branch.

### Required GitHub Secrets

Set these in your repository settings (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USERNAME` | SSH username (e.g., root) |
| `VPS_SSH_KEY` | Your private SSH key |
| `VPS_PORT` | SSH port (usually 22) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | HTTP server port (internal) |
| `HOST` | 0.0.0.0 | Bind address |
| `NEXTCLOUD_HOST` | (required) | Your Nextcloud instance URL |
| `NEXTCLOUD_USERNAME` | (required) | Nextcloud username |
| `NEXTCLOUD_PASSWORD` | (required) | Nextcloud password or app password |

## Analytics Dashboard

The MCP server includes a built-in analytics dashboard:

- **Dashboard:** `https://mcp.techmavie.digital/nextcloud/analytics/dashboard`
- **API:** `https://mcp.techmavie.digital/nextcloud/analytics`

Features:
- Total requests and tool calls
- Tool usage distribution (doughnut chart)
- Hourly request trends (last 24 hours)
- Recent tool calls feed
- Auto-refreshes every 30 seconds

## Troubleshooting

### Container not starting

```bash
docker compose logs mcp-nextcloud
```

### Nginx 502 Bad Gateway

- Check if container is running: `docker compose ps`
- Check container logs: `docker compose logs`
- Verify port binding: `docker port mcp-nextcloud`

### Authentication errors

- Verify your Nextcloud credentials are correct
- Make sure you're using an App Password if 2FA is enabled
- Check that the Nextcloud host URL is correct (include https://)

### Test MCP connection

```bash
# List tools
curl -X POST https://mcp.techmavie.digital/nextcloud/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call hello tool
curl -X POST https://mcp.techmavie.digital/nextcloud/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"nextcloud_hello","arguments":{}}}'
```

## Port Allocation

Based on your existing MCP servers:
- **8180** - Malaysia Transit MCP
- **3003** - Keywords Everywhere MCP
- **8083** - Malaysia Open Data MCP
- **8084** - GitHub MCP
- **8085** - Nextcloud MCP (this server)

## Security Notes

- The MCP server runs behind nginx with SSL
- Credentials can be provided via environment variables (recommended) or query params
- Use App Passwords instead of your main Nextcloud password
- Consider adding rate limiting at nginx level if needed
