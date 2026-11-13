FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM build AS test
RUN npm test

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/dist/index.html /etc/tower-duty/index.html
COPY --chmod=755 docker/40-site-url.sh /docker-entrypoint.d/
EXPOSE 80
