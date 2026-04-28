#!/bin/bash
# Restore from a local daily backup
#
# Usage:
#   bash restore.sh                        <- lists available backups
#   bash restore.sh mongo_20260501_0200    <- restores that specific backup

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
BACKUP_DIR="$SCRIPT_DIR/../backups/daily"

if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

if [ -z "$MONGODB_URI" ]; then
  echo "ERROR: MONGODB_URI not set in .env"
  exit 1
fi

# No argument — list available backups
if [ -z "$1" ]; then
  echo "Available backups:"
  ls "$BACKUP_DIR"/*.tar.gz 2>/dev/null | xargs -n1 basename || echo "  (none found)"
  echo ""
  echo "Usage: bash restore.sh mongo_YYYYMMDD_HHMM"
  exit 0
fi

BACKUP_NAME="$1"
ARCHIVE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

if [ ! -f "$ARCHIVE" ]; then
  echo "ERROR: Backup not found: $ARCHIVE"
  exit 1
fi

echo "[$(date)] Restoring from: $ARCHIVE"
echo "WARNING: This will overwrite the current database. Press Ctrl+C to cancel."
sleep 5

TMP_DIR=$(mktemp -d)
tar -xzf "$ARCHIVE" -C "$TMP_DIR"

mongorestore --uri="$MONGODB_URI" --drop "$TMP_DIR/$BACKUP_NAME/"

rm -rf "$TMP_DIR"

echo "[$(date)] Restore complete."
