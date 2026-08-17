# --- Étape 1 : dépendances ---------------------------------------------------
#
# better-sqlite3 est un module natif : il doit être compilé pour la plateforme
# cible. On l'isole dans une étape dédiée pour que la chaîne de compilation
# (python3, make, g++, ~300 Mo) ne se retrouve pas dans l'image finale.
FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Étape 2 : image d'exécution ---------------------------------------------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Même image de base qu'à l'étape précédente : le binaire natif compilé y est
# donc directement utilisable.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# L'image node fournit déjà un utilisateur non privilégié « node ». Le volume
# des données lui appartient, sans quoi l'écriture de la base échouerait.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000

# node:24-slim n'embarque ni wget ni curl : on interroge la sonde avec le fetch
# natif de Node.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
