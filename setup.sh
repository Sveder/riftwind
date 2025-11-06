#!/bin/bash
# Setup script for Riftwind Flask app with HTTPS

set -e  # Exit on error

echo "======================================"
echo "Setting up Riftwind Flask App"
echo "======================================"
echo ""

# Copy systemd service file
echo "[1/6] Installing systemd service..."
sudo cp /home/sveder/rift/riftwind/riftwind.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable riftwind.service

# Start service
echo "[2/6] Starting Riftwind service..."
sudo systemctl restart riftwind.service
sleep 2

# Install temporary HTTP-only nginx config
echo "[3/6] Installing temporary HTTP-only nginx configuration..."
sudo cp /home/sveder/rift/riftwind/riftwind-http-only.nginx /etc/nginx/sites-available/riftwind
sudo ln -sf /etc/nginx/sites-available/riftwind /etc/nginx/sites-enabled/riftwind
sudo nginx -t && sudo systemctl reload nginx

echo "HTTP site is now live at http://rift.sveder.com"
echo ""

# Check if SSL certificate already exists
if [ -d "/etc/letsencrypt/live/rift.sveder.com" ]; then
    echo "[4/6] SSL certificate already exists for rift.sveder.com"
    CERT_EXISTS=true
else
    echo "[4/6] Obtaining SSL certificate with Let's Encrypt..."
    echo "This requires the domain to be pointing to this server..."

    if sudo certbot certonly --webroot -w /var/www/html -d rift.sveder.com --non-interactive --agree-tos --register-unsafely-without-email; then
        echo "✓ SSL certificate obtained successfully!"
        CERT_EXISTS=true
    else
        echo "⚠ Certificate creation failed. The domain may not be pointing to this server yet."
        echo "You can obtain it manually later with:"
        echo "  sudo certbot certonly --webroot -w /var/www/html -d rift.sveder.com"
        CERT_EXISTS=false
    fi
fi

# Install final nginx config (HTTPS if cert exists, HTTP-only otherwise)
if [ "$CERT_EXISTS" = true ]; then
    echo "[5/6] Installing HTTPS nginx configuration..."
    sudo cp /home/sveder/rift/riftwind/riftwind.nginx /etc/nginx/sites-available/riftwind
else
    echo "[5/6] Keeping HTTP-only configuration (no SSL cert available)..."
fi

# Test and reload nginx
echo "[6/6] Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "======================================"
echo "Setup complete!"
echo "======================================"
echo ""
echo "Service status:"
sudo systemctl status riftwind.service --no-pager -l | head -15
echo ""

if [ "$CERT_EXISTS" = true ]; then
    echo "✓ The app is accessible at https://rift.sveder.com"
    echo "✓ SSL certificate is installed and HTTP redirects to HTTPS"
else
    echo "✓ The app is accessible at http://rift.sveder.com"
    echo ""
    echo "To enable HTTPS, ensure rift.sveder.com points to this server, then run:"
    echo "  sudo certbot certonly --webroot -w /var/www/html -d rift.sveder.com"
    echo "  sudo cp /home/sveder/rift/riftwind/riftwind.nginx /etc/nginx/sites-available/riftwind"
    echo "  sudo systemctl reload nginx"
fi

echo ""
echo "Useful commands:"
echo "  sudo systemctl status riftwind      - Check service status"
echo "  sudo systemctl restart riftwind     - Restart the service (after code changes)"
echo "  sudo journalctl -u riftwind -f      - View live logs"
echo "  sudo journalctl -u riftwind -n 100  - View last 100 log lines"
echo "  sudo certbot renew --dry-run        - Test certificate renewal"
echo "  sudo systemctl reload nginx         - Reload nginx config"
