# Riftwind Deployment - COMPLETED ✓

## Status

✓ **rift.sveder.com is now live with HTTPS!**

- HTTP: http://rift.sveder.com → Redirects to HTTPS
- HTTPS: https://rift.sveder.com → Working perfectly

## What Was Configured

### 1. Riftwind Flask App
- **Service**: `riftwind.service` (systemd)
- **Port**: 8202 (internal)
- **Status**: Active and enabled (auto-starts on boot)
- **Location**: `/home/sveder/rift/riftwind`

### 2. Nginx Configuration
- **SSL Certificate**: Let's Encrypt (auto-renews)
- **Expires**: February 4, 2026
- **HTTP/2**: Enabled
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

### 3. Baseline Game (Fixed)
- Moved from port 443 to port 8443
- Now managed by systemd: `baseline_game.service`
- Nginx handles SSL termination for both apps
- baseline.sveder.com still works correctly

## Services Running

```bash
sudo systemctl status riftwind       # Your new Flask app
sudo systemctl status baseline_game  # Existing Django app (reconfigured)
sudo systemctl status nginx          # Web server (handling SSL for both)
```

## Port Layout

| Service       | Port | Protocol | Purpose                |
|---------------|------|----------|------------------------|
| nginx         | 80   | HTTP     | Redirects to HTTPS     |
| nginx         | 443  | HTTPS    | SSL termination        |
| riftwind      | 8202 | HTTP     | Flask app backend      |
| baseline_game | 8443 | HTTP     | Django app backend     |

## Useful Commands

### Riftwind Management
```bash
# Restart after code changes (per CLAUDE.md)
sudo systemctl restart riftwind

# View logs
sudo journalctl -u riftwind -f

# Check status
sudo systemctl status riftwind
```

### Baseline Game Management
```bash
# Restart
sudo systemctl restart baseline_game

# View logs
sudo journalctl -u baseline_game -f
```

### Nginx Management
```bash
# Reload configuration (after changing nginx configs)
sudo systemctl reload nginx

# Test configuration
sudo nginx -t
```

### SSL Certificate Management
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates (happens automatically, but you can test)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

## Configuration Files

### Riftwind
- Systemd service: `/etc/systemd/system/riftwind.service`
- Nginx config: `/etc/nginx/sites-available/riftwind`
- Gunicorn config: `/home/sveder/rift/riftwind/gunicorn_config.py`
- App code: `/home/sveder/rift/riftwind/app.py`

### Baseline Game
- Systemd service: `/etc/systemd/system/baseline_game.service`
- Nginx config: `/etc/nginx/sites-available/baseline`
- Gunicorn config: `/home/sveder/baseline_game/gunicorn.conf.py`

## Changes Made to Existing Setup

1. **baseline_game/gunicorn.conf.py**:
   - Changed port from 443 to 8443
   - Disabled SSL (nginx handles it now)

2. **baseline_game/baseline_game.service**:
   - Changed Group from "sveder" to "users"

3. **Created nginx configurations**:
   - `/etc/nginx/sites-available/baseline` (new)
   - `/etc/nginx/sites-available/riftwind` (new)

## Security Features

- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS header (forces HTTPS for 1 year)
- X-Frame-Options (prevents clickjacking)
- X-Content-Type-Options (prevents MIME sniffing)
- X-XSS-Protection (enables XSS filter)

## Troubleshooting

### Site not responding?
```bash
sudo systemctl status riftwind
sudo systemctl status nginx
sudo journalctl -u riftwind -n 50
```

### SSL certificate issues?
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Port conflicts?
```bash
sudo lsof -i :443
sudo lsof -i :8202
sudo lsof -i :8443
```

## Testing

All endpoints tested and working:
- ✓ http://rift.sveder.com → 301 redirect to HTTPS
- ✓ https://rift.sveder.com → 200 OK (HTTP/2)
- ✓ http://baseline.sveder.com → 301 redirect to HTTPS
- ✓ https://baseline.sveder.com → 200 OK (HTTP/2)
