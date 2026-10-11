FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web ./web
COPY shared ./shared
COPY vite.config.ts tsconfig.json ./
RUN pnpm build

FROM node:24.19.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production APP_MODE=demo PORT=10000
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY package.json ./
USER node
EXPOSE 10000
CMD ["node", "server/index.ts"]
