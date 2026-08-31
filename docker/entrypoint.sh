#!/bin/sh
set -eu

mkdir -p /data/storage

if [ "${DATABASE_PROVIDER:-sqlite}" = "sqlite" ]; then
  mkdir -p "$(dirname "${DATABASE_URL#file:}")"
fi

if [ "${SKIP_MIGRATE:-}" != "1" ]; then
  bun run db:migrate
fi

exec bun run start
