FROM node:lts-alpine
RUN export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && corepack enable pnpm
WORKDIR /app
RUN chown node:node /app
USER node
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    pnpm install --frozen-lockfile

COPY --chown=node:node . .
RUN pnpm start
