FROM node:lts-alpine
RUN npm install -g pnpm@12.14.0
WORKDIR /app
RUN chown node:node /app
USER node
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,uid=1000,gid=1000 \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY --chown=node:node . .
CMD ["pnpm", "start"]
