# Built from the repo root so the shared lib/ packages are available:
#   docker compose up --build arcade
# The build stage always runs on the builder's own CPU type ($BUILDPLATFORM):
# its output is plain web files, so it only needs to run once even when we
# publish images for several server types (amd64 and arm64).
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build -w arcade

FROM nginx:1.27-alpine
COPY arcade/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/arcade/dist /usr/share/nginx/html
