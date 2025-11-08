# Deployment Instructions for Riftwind

## Current Status

✓ DNS is configured correctly (rift.sveder.com → 138.68.97.149)
✓ Flask app is running on port 8202
✗ Nginx is not running
✗ Nginx configuration for rift.sveder.com not installed

## Quick Fix

Run these commands to get the site working:

```bash
# 1. Start nginx
sudo systemctl start nginx
sudo systemctl status nginx

# 2. Install nginx configuration
sudo cp /home/sveder/rift/riftwind/riftwind-http-only.nginx /etc/nginx/sites-available/riftwind
sudo ln -sf /etc/nginx/sites-available/riftwind /etc/nginx/sites-enabled/riftwind

# 3. Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Test the site
curl -I http://rift.sveder.com
```

## Full Production Setup with HTTPS and Systemd

Once the quick fix works, run the full setup script:

```bash
# Kill the manually started gunicorn
pkill -f "gunicorn.*8202"

# Run the full setup
./setup.sh
```

This will:
- Install systemd service (auto-start on boot)
- Obtain Let's Encrypt SSL certificate
- Configure HTTPS with proper security headers
- Set up automatic certificate renewal

## Manual Commands

### Start/Stop the Flask app manually:
```bash
# Start
/usr/bin/python3 /home/sveder/.local/bin/gunicorn -c gunicorn_config.py app:app --daemon

# Stop
pkill -f "gunicorn.*8202"

# Check status
ps aux | grep "gunicorn.*8202"
ss -tlnp | grep 8202
```

### Check logs:
```bash
# If using systemd
sudo journalctl -u riftwind -f

# If running manually
# Logs go to stdout/stderr
```

## Troubleshooting

### Nginx won't start?
```bash
sudo journalctl -u nginx -n 50
sudo nginx -t
```

### App not responding?
```bash
curl http://localhost:8202/
ps aux | grep gunicorn | grep 8202
```

### Domain not resolving?
```bash
dig +short rift.sveder.com
```
