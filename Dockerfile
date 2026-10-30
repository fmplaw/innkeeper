# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
# npm lance node-gyp pour better-sqlite3 (présence d'un binding.gyp), même
# quand le binaire précompilé fourni dans le paquet est utilisé.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Les tests automatisés tournent à chaque construction : une image ne sort pas si l'un échoue.
RUN npm test && npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
# BODY_SIZE_LIMIT : adapter-node refuse les requêtes > 512 Ko par défaut ; il faut
# la place pour une bannière (4 Mo) et un logo (1 Mo) dans le même formulaire.
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/guilde.db \
    MIGRATIONS_DIR=/app/drizzle \
    BODY_SIZE_LIMIT=6M

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY scripts ./scripts

# Lisible par n'importe quel UID (compose peut imposer `user:`), quelles que
# soient les permissions des fichiers source.
RUN chmod -R a+rX /app \
 && mkdir /data /backups && chown node:node /data /backups
USER node
VOLUME /data
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "build"]
