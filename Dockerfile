# syntax=docker/dockerfile:1

FROM oven/bun:1 AS deps
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json bun.lock ./
COPY sdk/package.json ./sdk/package.json

RUN bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app

# Copy the full workspace (app + sdk)
COPY . .

# Builds sdk first, then app (configured in root package.json)
RUN bun run build

FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy runtime artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["bun", "dist/index.js"]
