#!/bin/bash

# DigitalOcean Deployment Script for Scarlet Backend
# This script will deploy your backend to a DigitalOcean droplet

set -e

echo "🚀 Starting DigitalOcean Deployment for Scarlet Backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP=""
DROPLET_USER="root"
APP_DIR="/var/www/scarlet-backend"
DOMAIN="api.scarletunlimited.net"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if droplet IP is provided
if [ -z "$1" ]; then
    print_error "Please provide the DigitalOcean droplet IP address"
    echo "Usage: ./deploy-digitalocean.sh <DROPLET_IP>"
    echo "Example: ./deploy-digitalocean.sh 157.245.123.456"
    exit 1
fi

DROPLET_IP=$1

print_status "Deploying to DigitalOcean Droplet: $DROPLET_IP"

# Step 1: Build the application locally
print_status "Building application locally..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Build failed. Please fix the build errors first."
    exit 1
fi

print_success "Application built successfully"

# Step 2: Create deployment package
print_status "Creating deployment package..."
tar -czf scarlet-backend.tar.gz \
    dist/ \
    package.json \
    package-lock.json \
    .env.production \
    ecosystem.config.js \
    nginx.conf \
    ssl-setup.sh

print_success "Deployment package created"

# Step 3: Upload to droplet
print_status "Uploading files to droplet..."
scp scarlet-backend.tar.gz $DROPLET_USER@$DROPLET_IP:/tmp/

if [ $? -ne 0 ]; then
    print_error "Failed to upload files. Please check your SSH connection."
    exit 1
fi

print_success "Files uploaded successfully"

# Step 4: Deploy on droplet
print_status "Deploying on droplet..."
ssh $DROPLET_USER@$DROPLET_IP << EOF
    set -e
    
    echo "📦 Extracting deployment package..."
    cd /tmp
    tar -xzf scarlet-backend.tar.gz
    
    echo "📁 Creating application directory..."
    mkdir -p $APP_DIR
    cp -r dist/ package.json package-lock.json $APP_DIR/
    
    echo "🔧 Installing dependencies..."
    cd $APP_DIR
    npm ci --production
    
    echo "🔐 Setting up environment..."
    if [ -f /tmp/.env.production ]; then
        cp /tmp/.env.production $APP_DIR/.env
    fi
    
    echo "🌐 Setting up Nginx..."
    if [ -f /tmp/nginx.conf ]; then
        cp /tmp/nginx.conf /etc/nginx/sites-available/scarlet-backend
        ln -sf /etc/nginx/sites-available/scarlet-backend /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    fi
    
    echo "🔄 Setting up PM2..."
    npm install -g pm2
    if [ -f /tmp/ecosystem.config.js ]; then
        cp /tmp/ecosystem.config.js $APP_DIR/
    fi
    
    echo "🔒 Setting up SSL..."
    if [ -f /tmp/ssl-setup.sh ]; then
        chmod +x /tmp/ssl-setup.sh
        /tmp/ssl-setup.sh $DOMAIN
    fi
    
    echo "🚀 Starting application..."
    cd $APP_DIR
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    echo "🔄 Restarting services..."
    systemctl restart nginx
    systemctl enable nginx
    
    echo "✅ Deployment completed successfully!"
    
    # Cleanup
    rm -f /tmp/scarlet-backend.tar.gz
    rm -rf /tmp/dist /tmp/package.json /tmp/package-lock.json /tmp/.env.production /tmp/ecosystem.config.js /tmp/nginx.conf /tmp/ssl-setup.sh
EOF

if [ $? -ne 0 ]; then
    print_error "Deployment failed on droplet"
    exit 1
fi

print_success "Deployment completed successfully!"

# Step 5: Test deployment
print_status "Testing deployment..."
sleep 5

# Test health endpoint
if curl -f "http://$DROPLET_IP/api/health" > /dev/null 2>&1; then
    print_success "Health check passed"
else
    print_warning "Health check failed, but deployment might still be successful"
fi

# Test IP detection
print_status "Testing IP detection..."
curl -s "http://$DROPLET_IP/api/debug/check-ip" | jq '.currentIP, .isUsingCloudflare'

print_success "Deployment completed!"
print_status "Your backend is now running at: http://$DROPLET_IP"
print_status "SSL will be available at: https://$DOMAIN (after DNS propagation)"

# Cleanup local files
rm -f scarlet-backend.tar.gz

echo ""
echo "🎉 Next Steps:"
echo "1. Update your DNS to point $DOMAIN to $DROPLET_IP"
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "3. Test SMS service with SSL Wireless"
echo "4. Update frontend to use new API URL"
echo ""
echo "📧 Send this IP to SSL Wireless for whitelisting: $DROPLET_IP"
