# Built from the repo root so the shared lib/ packages are available:
#   docker compose up --build arcade
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build -w arcade

FROM nginx:1.27-alpine
COPY arcade/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/arcade/dist /usr/share/nginx/html
