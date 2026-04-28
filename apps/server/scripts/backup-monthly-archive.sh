#!/bin/bash
# Monthly archive — runs 1st of each month via Task Scheduler
# Dumps critical collections from live Atlas DB → local tar.gz + pushes to Atlas archive cluster
# These are NEVER deleted — permanent historical record
#
# Requires: MongoDB Database Tools (mongodump + mongorestore)
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

if [ -z "$ARCHIVE_URL" ]; then
  echo "ERROR: ARCHIVE_URL not set in .env"
  exit 1
fi

# Find mongodump / mongorestore
MONGODUMP="mongodump"
MONGORESTORE="mongorestore"
if ! command -v mongodump &>/dev/null; then
  for candidate in \
    "/c/Program Files/MongoDB/Tools/100/bin/mongodump.exe" \
    "/c/Program Files/MongoDB/Tools/bin/mongodump.exe" \
    "/c/mongodb-database-tools/bin/mongodump.exe"; do
    if [ -f "$candidate" ]; then
      MONGODUMP="$candidate"
      MONGORESTORE="${candidate/mongodump/mongorestore}"
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

MONTH=$(date +%Y%m)
ARCHIVE_ROOT="$SCRIPT_DIR/../backups/archives"
DUMP_PATH="$ARCHIVE_ROOT/royal_suites_$MONTH"

mkdir -p "$ARCHIVE_ROOT"

echo "[$(date)] Starting monthly archive for $MONTH..."

# Dump only critical collections — financial + guest history
"$MONGODUMP" --uri="$MONGODB_URI" \
  --db=royal-suites \
  --collection=reservations \
  --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=bills      --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=guests      --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=payments    --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=orders      --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=spabookings --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=walkincustomers --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=reviews     --out="$DUMP_PATH"
"$MONGODUMP" --uri="$MONGODB_URI" --db=royal-suites --collection=users       --out="$DUMP_PATH"

echo "[$(date)] Dump complete. Pushing to Atlas archive cluster..."

# Push to Atlas archive cluster under a month-namespaced DB (e.g. royalsuites_202605)
"$MONGORESTORE" \
  --uri="$ARCHIVE_URL" \
  --nsFrom="royal-suites.*" \
  --nsTo="royalsuites_$MONTH.*" \
  --drop \
  "$DUMP_PATH"

echo "[$(date)] Atlas push complete."

# Compress local copy — keep forever, never delete
tar -czf "$DUMP_PATH.tar.gz" -C "$ARCHIVE_ROOT" "royal_suites_$MONTH"
rm -rf "$DUMP_PATH"

echo "[$(date)] Monthly archive done."
echo "[$(date)]   Local:  $DUMP_PATH.tar.gz"
echo "[$(date)]   Atlas:  royalsuites_$MONTH (in archive cluster)"
