#!/bin/bash
# Daily backup — runs every night via Task Scheduler
# Dumps live Atlas DB locally, keeps 30 days rolling
#
# Requires: MongoDB Database Tools (mongodump)
# Install: https://www.mongodb.com/try/download/database-tools

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Load env vars
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

if [ -z "$MONGODB_URI" ]; then
  echo "ERROR: MONGODB_URI not set in .env"
  exit 1
fi

# Find mongodump — try PATH first, then common Windows install locations
MONGODUMP="mongodump"
if ! command -v mongodump &>/dev/null; then
  for candidate in \
    "/c/Program Files/MongoDB/Tools/100/bin/mongodump.exe" \
    "/c/Program Files/MongoDB/Tools/bin/mongodump.exe" \
    "/c/mongodb-database-tools/bin/mongodump.exe"; do
    if [ -f "$candidate" ]; then
      MONGODUMP="$candidate"
      break
    fi
  done
fi

if ! command -v "$MONGODUMP" &>/dev/null && [ ! -f "$MONGODUMP" ]; then
  echo "ERROR: mongodump not found."
  echo "Download MongoDB Database Tools from:"
  echo "  https://www.mongodb.com/try/download/database-tools"
  exit 1
fi

DATE=$(date +%Y%m%d_%H%M)
BACKUP_ROOT="$SCRIPT_DIR/../backups"
BACKUP_DIR="$BACKUP_ROOT/daily"
DUMP_PATH="$BACKUP_DIR/mongo_$DATE"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting daily backup..."

"$MONGODUMP" --uri="$MONGODB_URI" --out="$DUMP_PATH"

tar -czf "$DUMP_PATH.tar.gz" -C "$BACKUP_DIR" "mongo_$DATE"
rm -rf "$DUMP_PATH"

echo "[$(date)] Backup saved: $DUMP_PATH.tar.gz"

# Delete backups older than 30 days
find "$BACKUP_DIR" -name "mongo_*.tar.gz" -mtime +30 -delete
echo "[$(date)] Old backups cleaned (>30 days removed)"
