# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Uploaded operator-agreement / policy files land here (see UPLOADS_DIR /
# src/storage/local-disk.storage.ts) — meant to be a mounted volume in
# production so files survive a redeploy.
RUN mkdir -p /app/uploads && chown -R app:app /app
VOLUME ["/app/uploads"]

USER app
EXPOSE 4011

CMD ["node", "dist/main.js"]
