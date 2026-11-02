#!/usr/bin/env bash
# Backup MySQL (mysqldump) + MinIO data (tar) from the running compose containers.
# Read-only for the live data — safe to run on production at any time.
#
# Usage:
#   bash scripts/backup.sh                 # writes to $BACKUP_DIR (default ./backups)
#   BACKUP_DIR=/var/backups/boxmag BACKUP_RETENTION_DAYS=14 bash scripts/backup.sh
#
# Cron (zilnic la 03:15):
#   15 3 * * * cd /opt/boxmag && bash scripts/backup.sh >> /var/log/boxmag-backup.log 2>&1
#
# Restore (vezi deploy/PRODUCTION_CHECKLIST.md, sectiunea Backup):
#   gunzip -c mysql-<ts>.sql.gz | docker exec -i -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" boxmag4-mysql mysql -uroot
#   docker run --rm --volumes-from boxmag4-minio -v "$PWD":/backup alpine tar xzf /backup/minio-<ts>.tar.gz -C /
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-boxmag4-mysql}"
MINIO_CONTAINER="${MINIO_CONTAINER:-boxmag4-minio}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

if [[ ! -f .env ]]; then
  echo "Eroare: lipseste .env (trebuie MYSQL_ROOT_PASSWORD si MYSQL_DATABASE)."
  exit 1
fi

# Read only the variables we need; never `source` the whole .env.
env_value() {
  grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-$(env_value MYSQL_ROOT_PASSWORD)}"
MYSQL_DATABASE="${MYSQL_DATABASE:-$(env_value MYSQL_DATABASE)}"
MYSQL_DATABASE="${MYSQL_DATABASE:-boxmag4}"

if [[ -z "$MYSQL_ROOT_PASSWORD" ]]; then
  echo "Eroare: MYSQL_ROOT_PASSWORD lipseste."
  exit 1
fi

for container in "$MYSQL_CONTAINER" "$MINIO_CONTAINER"; do
  if [[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null)" != "true" ]]; then
    echo "Eroare: containerul $container nu ruleaza."
    exit 1
  fi
done

# Deploy calls this right after `compose up`, so give MySQL time to accept connections.
for _ in $(seq 1 60); do
  if docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER" \
    mysqladmin ping -h 127.0.0.1 -uroot --silent >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MYSQL_FILE="$BACKUP_DIR/mysql-$TIMESTAMP.sql.gz"
MINIO_FILE="$BACKUP_DIR/minio-$TIMESTAMP.tar.gz"

echo "==> MySQL dump ($MYSQL_DATABASE) -> $MYSQL_FILE"
# MYSQL_PWD keeps the password off the process list.
docker exec -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "$MYSQL_CONTAINER" \
  mysqldump -uroot --single-transaction --quick --routines --triggers \
  --set-gtid-purged=OFF --databases "$MYSQL_DATABASE" \
  | gzip -9 > "$MYSQL_FILE.partial"
mv "$MYSQL_FILE.partial" "$MYSQL_FILE"

echo "==> MinIO data -> $MINIO_FILE"
docker run --rm --volumes-from "$MINIO_CONTAINER" -v "$BACKUP_DIR":/backup alpine \
  tar czf "/backup/minio-$TIMESTAMP.tar.gz.partial" -C / data
mv "$MINIO_FILE.partial" "$MINIO_FILE"

chmod 600 "$MYSQL_FILE" "$MINIO_FILE"

echo "==> Sterg backup-uri mai vechi de $BACKUP_RETENTION_DAYS zile"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'mysql-*.sql.gz' -o -name 'minio-*.tar.gz' \) \
  -mtime +"$BACKUP_RETENTION_DAYS" -print -delete

echo "==> Backup finalizat: $(du -h "$MYSQL_FILE" | cut -f1) MySQL, $(du -h "$MINIO_FILE" | cut -f1) MinIO"
echo "    Copiaza periodic $BACKUP_DIR in afara serverului (rsync / rclone / S3)."
