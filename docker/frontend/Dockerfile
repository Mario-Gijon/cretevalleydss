FROM oven/bun:1 AS builder

WORKDIR /app

ARG VITE_API_BACK=/api
ARG VITE_MODE=production

COPY ./Frontend/package.json ./Frontend/bun.lockb ./
RUN bun install --frozen-lockfile
COPY ./Frontend .

ENV NODE_ENV=production \
    VITE_API_BACK=$VITE_API_BACK \
    VITE_MODE=$VITE_MODE

RUN bun run build

FROM nginx:alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
