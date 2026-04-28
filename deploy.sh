#!/bin/bash
set -e

REMOTE_URL=$(git remote get-url origin)

echo "Loading prod env..."
set -a
source .env.prod
set +a

echo "Building v${VITE_VERSION}..."
VITE_BASE_PATH=/note-keeper/ npm run build

echo "Deploying to gh-pages..."
DEPLOY_TMP=$(mktemp -d)
trap "rm -rf '$DEPLOY_TMP'" EXIT

cp -r build/. "$DEPLOY_TMP"

git -C "$DEPLOY_TMP" init -q
git -C "$DEPLOY_TMP" checkout -b gh-pages
git -C "$DEPLOY_TMP" add -A
git -C "$DEPLOY_TMP" commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S') — v${VITE_VERSION}" -q
git -C "$DEPLOY_TMP" remote add origin "$REMOTE_URL"
git -C "$DEPLOY_TMP" push -f origin gh-pages

echo "Done. Deployed v${VITE_VERSION} to gh-pages."
