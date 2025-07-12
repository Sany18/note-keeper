set -o allexport
source .env.prod
set +o allexport

# Makes from VITE_VERSION=0.0.006 -> 0.0.007
echo "Updating VITE_VERSION"

VERSION=$(cat .env.prod | grep VITE_VERSION | cut -d '=' -f2)

echo "Current version: $VERSION"

IFS='.' read -r -a version_parts <<< "$VERSION"
version_parts[2]=$(printf "%02d" $((10#${version_parts[2]} + 1)))
VERSION="${version_parts[0]}.${version_parts[1]}.${version_parts[2]}"
# Put version to the .env.prod
sed -i "s/VITE_VERSION=.*/VITE_VERSION=$VERSION/" .env.prod
# Put version to the package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" fe/package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" be/package.json

echo "New version: ${version_parts[0]}.${version_parts[1]}.${version_parts[2]}"
# End of updating version section

# Re-source the updated .env.prod file
set -o allexport
source .env.prod
set +o allexport


echo "Deploying to $REMOTE_HOST"

pnpm run build
rsync -av ./fe/build/ root@${REMOTE_HOST}:/var/www/${DOMAIN}/fe
rsync -av ./be/dist/ root@${REMOTE_HOST}:/var/www/${DOMAIN}/be

echo "Deployed to $REMOTE_HOST"

# Reset cloudflare cache
echo "Cloudflare: Purging cache"
response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
     -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
     -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}')

if echo "$response" | grep -q '"success": true'; then
  echo "Cloudflare: Cache purge successful"
  echo "New version: ${version_parts[0]}.${version_parts[1]}.${version_parts[2]}"
else
  echo "Cloudflare: Cache purge failed"
fi
