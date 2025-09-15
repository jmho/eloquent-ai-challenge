# syntax=docker/dockerfile:1

# Build base with deps and generated Prisma client
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g corepack@latest
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Install ALL deps here (prisma CLI is usually a devDep)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN pnpm run build

# "migrator" image keeps devDeps so it has the Prisma CLI + migration engine
FROM base AS migrator
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

# Slim runtime image for the app
FROM node:20-slim AS app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g corepack@latest
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/build ./build
COPY package.json ./
# Drop dev deps; @prisma/client stays because it's a prod dep
RUN pnpm prune --prod
EXPOSE 3000
CMD ["pnpm", "start"]