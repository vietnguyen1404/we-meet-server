#!/bin/sh
set -e

echo "[start] Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "[start] Seeding default admin user..."
node dist/prisma/seed.js

echo "[start] Starting NestJS application..."
exec node dist/src/main.js
