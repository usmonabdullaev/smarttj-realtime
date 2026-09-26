FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "dist/main.js"]