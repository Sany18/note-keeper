set -o allexport
source .env.prod  # Ensure .env.prod contains REMOTE_HOST and DOMAIN variables
set +o allexport

# Check if Nginx is installed, and install it if not
ssh root@${REMOTE_HOST} << 'EOF'
if ! command -v nginx &> /dev/null; then
  echo 'Nginx not found. Installing Nginx...'
  apt update
  apt install nginx -y
fi
EOF

echo "Updating nginx config"

# Substitute environment variables in nginx.conf and copy directly to the remote server
envsubst "`printf '${%s} ' $(bash -c "compgen -A variable")`" < nginx.conf | ssh root@${REMOTE_HOST} "cat > /etc/nginx/sites-available/${DOMAIN}"

# Create a symbolic link to the config file in sites-enabled and restart Nginx
ssh root@${REMOTE_HOST} "ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/"
ssh root@${REMOTE_HOST} "service nginx restart"
