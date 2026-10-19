# Built from the repo root so the shared lib/ packages are available:
#   docker compose up --build super-flynn-bros
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build -w super-flynn-bros

FROM nginx:1.27-alpine
COPY super-flynn-bros/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/super-flynn-bros/dist /usr/share/nginx/html
