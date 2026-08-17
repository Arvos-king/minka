# --- Étape 1 : compilation de la SPA -----------------------------------------
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Étape 2 : service des fichiers statiques --------------------------------
#
# L'image finale ne contient pas Node : uniquement nginx et le contenu de
# `dist/`. Elle pèse une quinzaine de mégaoctets.
FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security.conf /etc/nginx/snippets/minka-security.conf

EXPOSE 80
