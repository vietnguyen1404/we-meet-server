# ---- Stage 1: Build ----
# Target linux/amd64 explicitly — prevents accidental ARM64 builds on Apple Silicon
# which cause "exec format error" on ECS (x86_64) instances.
FROM --platform=linux/amd64 node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack (ships with Node 22)
RUN corepack enable

# Build tools required to compile native addons (e.g. bcrypt) + openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl

# Install all dependencies (dev + prod) using the locked manifest
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

# 1. Generate Prisma Client (includes linux-musl engine binary for Alpine)
# 2. Compile NestJS application (nest build only covers src/)
# 3. Compile the seed script separately (it lives under prisma/, outside nest's scope)
# 4. Save the exact prisma CLI version (must stay in sync with @prisma/client)
# 5. Prune dev dependencies
RUN pnpm prisma generate \
    && pnpm run build \
    && npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --moduleResolution node \
       --esModuleInterop --skipLibCheck --target ES2023 \
    && node -e "process.stdout.write(require('prisma/package.json').version)" > /tmp/.prisma-version \
    && pnpm prune --prod --ignore-scripts

# ---- Stage 2: Production ----
# Fresh minimal base — no build tools, no dev packages
FROM --platform=linux/amd64 node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# OpenSSL is required by the Prisma client and migration engine at runtime
RUN apk add --no-cache openssl

# Copy pruned node_modules (compiled native addons included, dev deps removed)
COPY --from=builder /app/node_modules ./node_modules

# package.json is required for npm install and Node.js module resolution
COPY --from=builder /app/package.json ./package.json

# Install the prisma CLI (devDep, removed by prune) in an isolated directory.
# npm can't parse pnpm's virtual store, so we install into a clean temp dir
# then merge just the prisma packages alongside the existing @prisma/client.
COPY --from=builder /tmp/.prisma-version /tmp/.prisma-version
RUN mkdir /tmp/prisma-install \
    && cd /tmp/prisma-install \
    && echo '{}' > package.json \
    && npm install "prisma@$(cat /tmp/.prisma-version)" --omit=dev 2>/dev/null \
    && cp -r node_modules/prisma /app/node_modules/prisma \
    && cp -r node_modules/.package-lock.json /dev/null 2>/dev/null || true \
    && cp -r node_modules/@prisma/* /app/node_modules/@prisma/ \
    && mkdir -p /app/node_modules/.bin \
    && printf '#!/bin/sh\nexec node /app/node_modules/prisma/build/index.js "$@"\n' \
        > /app/node_modules/.bin/prisma \
    && chmod +x /app/node_modules/.bin/prisma \
    && rm -rf /tmp/prisma-install /tmp/.prisma-version

# Copy compiled application (nest build outputs to dist/src/ due to tsconfig baseUrl)
COPY --from=builder /app/dist ./dist

# Prisma schema + migrations are needed by the migration engine at runtime
COPY prisma ./prisma

# Startup script: migrate → seed → start
COPY scripts/start.sh ./start.sh

# Run as a non-root user to prevent privilege escalation
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 -G nodejs \
    && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

CMD ["sh", "./start.sh"]