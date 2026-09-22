# INTUITION Cloud — multi-stage build
# Callers: docker build/run for hosted dashboard + Hono API.
# Serves dist/ + server/cloud; persists data/cloud (workspaces, sessions, shares).
# User instruction: 「可以」 (approve INTUITION Cloud product).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/types ./src/types
RUN mkdir -p data/cloud
EXPOSE 8787
CMD ["npx", "tsx", "server/cloud/index.ts"]
