set -o allexport
source .env.prod
set +o allexport

ssh root@$REMOTE_HOST
