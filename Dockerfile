FROM node:24-bookworm-slim AS frontend
WORKDIR /build/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

FROM node:24-bookworm-slim AS runtime
RUN groupadd --gid 10001 bbp && useradd --uid 10001 --gid bbp --no-create-home bbp
WORKDIR /opt/bbp/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/src/ ./src/
COPY --from=frontend /build/app/dist/ /opt/bbp/app/dist/
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/opt/bbp/server/data/bbp.sqlite
USER 10001:10001
EXPOSE 3001
CMD ["node", "src/index.mjs"]
