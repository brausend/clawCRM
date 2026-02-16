# -- Stage 1: Build --
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/

RUN pnpm install --frozen-lockfile

# Build args forwarded as env vars for Vite
ARG VITE_WS_URL=ws://localhost:3848
ARG VITE_INSTANCE_KEY=
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_INSTANCE_KEY=$VITE_INSTANCE_KEY

RUN pnpm --filter @clawcrm/shared build 2>/dev/null || true
RUN pnpm --filter @clawcrm/web build

# -- Stage 2: Serve --
FROM nginx:alpine
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
