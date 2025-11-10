#!/bin/bash
# Quick script to install nginx configuration for rift.sveder.com

echo "Installing nginx configuration for rift.sveder.com..."

# Install HTTP-only config first
sudo cp /home/sveder/rift/riftwind/riftwind-http-only.nginx /etc/nginx/sites-available/riftwind

# Enable the site
sudo ln -sf /etc/nginx/sites-available/riftwind /etc/nginx/sites-enabled/riftwind

# Test nginx config
echo "Testing nginx configuration..."
if sudo nginx -t; then
    echo "Configuration is valid, reloading nginx..."
    sudo systemctl reload nginx
    echo "Done! Site should now be accessible at http://rift.sveder.com"
else
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi
