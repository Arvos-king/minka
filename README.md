# Minka

Plateforme familiale privée, auto-hébergée sur unRAID. Deux comptes, un tableau
de bord, et des modules qu'on ajoute au fil des besoins.

L'architecture est **modulaire par construction** : ajouter une fonctionnalité
(calendrier, budget, tâches…) consiste à déposer un dossier côté API et un
dossier côté interface. Aucun fichier du socle n'est à modifier. Voir
[Ajouter un module](#ajouter-un-module).

---

## Architecture

```
navigateur ──HTTPS──► Nginx Proxy Manager ──HTTP──► IP_UNRAID:8070
                        (TLS, Force SSL)                  │
                                                          ▼
                                                   minka-web (nginx)
                                         /api/* ──────────┴──► minka-api:3000
                                         /*     ─────────────► SPA React
```

| Conteneur   | Rôle                                        | Port |
| ----------- | ------------------------------------------- | ---- |
| `minka-web` | Sert l'interface et relaie `/api`           | 8070 → 80 |
| `minka-api` | API Node/Express, base SQLite               | interne uniquement |

`minka-api` ne publie aucun port : l'API n'est joignable que par nginx, à
travers le réseau du stack.

**Pile technique** — React 19 + Vite + Tailwind v4 (PWA installable) côté
interface ; Node 24 + Express 5 + SQLite (better-sqlite3) côté API.

---

## Modules

### Liste de courses — `/courses`

Une seule liste, partagée par toute la maison. Pensée pour être utilisée d'une
main, en marchant dans les rayons :

- le champ d'ajout est **ancré en bas de l'écran** et garde le focus après
  chaque envoi, pour enchaîner les articles sans reposer le pouce ;
- toucher une ligne coche l'article — la zone tactile occupe toute la largeur ;
- les commandes `−` / `+` ajustent la quantité ; à 1, le `−` devient une
  corbeille, ce qui évite un bouton de plus sur la ligne ;
- les articles cochés basculent dans une section **Déjà pris** repliable, avec
  un bouton de purge à confirmation en deux temps ;
- toutes les actions sont **optimistes** : l'affichage réagit immédiatement et
  se corrige tout seul si le serveur refuse, ce qui rend l'application utilisable
  avec une connexion défaillante ;
- la liste se rafraîchit au retour sur l'application, ce qui suffit à voir les
  ajouts de l'autre sans recharger la page.

| Route | Effet |
| --- | --- |
| `GET /api/shopping/items?status=pending\|completed\|all` | Liste et compteurs |
| `POST /api/shopping/items` | Ajout (`name`, `quantity` facultatif) |
| `PATCH /api/shopping/items/:id` | Modification (`name`, `quantity`, `completed`) |
| `DELETE /api/shopping/items/completed` | Purge des articles cochés |
| `DELETE /api/shopping/items/:id` | Suppression d'un article |

---

## Déploiement sur unRAID

Le stack se déploie dans `/mnt/user/appdata/minka` (Compose Manager, ou
`docker compose` en ligne de commande).

```bash
cd /mnt/user/appdata/minka
cp .env.example .env
```

Préparer le dossier de données **avant** le premier démarrage. Le conteneur ne
tourne pas en root : si Docker crée `data/` lui-même, le dossier appartient à
`root` et l'API ne peut pas y écrire sa base.

```bash
mkdir -p data
chown -R 99:100 data
```

(`99:100` = `nobody:users`, la convention unRAID pour `appdata` ; ajuster si
`PUID`/`PGID` ont été changés dans `.env`.)

Renseigner ensuite `.env` — au minimum `SESSION_SECRET` et les deux comptes.
Le secret se génère avec :

```bash
openssl rand -base64 48
```

Puis :

```bash
docker compose up -d --build
```

La base est créée automatiquement au premier démarrage, dans
`/mnt/user/appdata/minka/data/minka.db`, ainsi que les comptes déclarés dans
`.env`.

### Après la première connexion

Les mots de passe initiaux restent écrits en clair dans le fichier `.env` du
serveur. Chacun devrait remplacer le sien depuis l'application : bouton en haut
à droite → **Changer de mot de passe**.

La création des comptes ne se rejoue jamais sur un compte existant : modifier
`.env` par la suite n'a aucun effet, et un redémarrage du conteneur ne remet
donc pas l'ancien mot de passe en place. Pour repartir de zéro sur un compte,
supprimer sa ligne dans la table `users` et redémarrer.

### Vérifier que tout tourne

```bash
docker compose ps
curl http://localhost:8070/api/health
```

La réponse attendue est `{"status":"ok","uptime":…,"modules":[…]}`.

---

## Configuration

Toutes les variables sont documentées dans [`.env.example`](.env.example). Les
trois qui méritent l'attention :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `SESSION_SECRET` | *(aucun)* | **Obligatoire.** Signe les jetons de session. Moins de 32 caractères et l'API refuse de démarrer. |
| `SESSION_COOKIE_SECURE` | `true` | Restreint le cookie de session au HTTPS. Voir l'avertissement ci-dessous. |
| `TRUST_PROXY` | `2` | Nombre de proxies devant l'API : Nginx Proxy Manager, puis le nginx de `minka-web`. |

### ⚠️ `SESSION_COOKIE_SECURE` et l'accès direct par IP

Avec `SESSION_COOKIE_SECURE=true`, **la connexion ne fonctionne pas via
`http://IP_UNRAID:8070`** : le navigateur refuse d'enregistrer un cookie
`Secure` reçu en clair. La page de connexion s'affiche, mais l'authentification
semble « ne rien faire ».

Ce n'est pas un bug. L'accès nominal est le sous-domaine HTTPS servi par NPM —
et le service worker de la PWA exige HTTPS de toute façon. Pour un test
ponctuel en direct sur le LAN, passer temporairement la variable à `false` et
relancer `docker compose up -d`.

### `TRUST_PROXY`

Sert à retrouver l'adresse réelle du visiteur derrière les proxies. Mal réglée,
la limitation du nombre de tentatives de connexion s'applique à l'adresse du
proxy, donc à tout le monde en même temps : une série d'échecs vous bloquerait
tous les deux d'un coup.

- `2` — derrière Nginx Proxy Manager (valeur par défaut)
- `1` — en accès direct sur le port 8070, sans reverse proxy

---

## Nginx Proxy Manager

Créer un **Proxy Host** avec les valeurs suivantes :

| Onglet | Champ | Valeur |
| --- | --- | --- |
| Details | Domain Names | `minka.<ton-domaine>` |
| Details | Scheme | `http` |
| Details | Forward Hostname / IP | l'adresse du serveur unRAID |
| Details | Forward Port | `8070` |
| Details | Block Common Exploits | ✅ |
| Details | Cache Assets | ❌ **à laisser désactivé** |
| SSL | SSL Certificate | Let's Encrypt |
| SSL | Force SSL · HTTP/2 · HSTS | ✅ |

**Pourquoi désactiver « Cache Assets »** : NPM mettrait `index.html` et `sw.js`
en cache, ce qui fige les téléphones sur une ancienne version de l'application
après chaque mise à jour. Le nginx du conteneur gère déjà finement les en-têtes
de cache — immuables pour les fichiers dont le nom contient une empreinte, et
`no-cache` pour les autres.

Rien à ajouter dans l'onglet « Advanced » : les en-têtes `X-Forwarded-*` posés
par défaut par NPM sont exactement ceux attendus.

---

## Sauvegarde

La base tient dans un seul fichier, mais le mode WAL en produit deux annexes
(`minka.db-wal`, `minka.db-shm`) : copier `minka.db` seul pendant que
l'application tourne donnerait une sauvegarde incomplète.

Méthode simple, à froid :

```bash
cd /mnt/user/appdata/minka
docker compose stop minka-api
cp -a data/minka.db /mnt/user/backups/minka-$(date +%F).db
docker compose start minka-api
```

Méthode à chaud, sans interruption de service :

```bash
docker exec minka-api node -e "new (require('better-sqlite3'))('/data/minka.db').exec(\"VACUUM INTO '/data/backup.db'\")"
```

---

## Développement local

Deux terminaux, sans Docker :

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

L'interface est alors sur <http://localhost:5173> et relaie `/api` vers
`localhost:3000` — le même montage qu'en production, donc ni CORS ni surprise
sur les cookies.

En développement, `SESSION_SECRET` est facultatif : un secret jetable est
généré au démarrage (les sessions ne survivent pas à un redémarrage).

Un fichier `backend/.env` (non versionné) est chargé automatiquement par
`npm run dev` — c'est là que vivent les comptes de test locaux. Il est distinct
du `.env` de la racine, qui ne sert qu'au déploiement Docker.

Pour régénérer les icônes de la PWA après un changement de couleur de marque :

```bash
cd frontend
node scripts/generate-icons.mjs
```

---

## Ajouter un module

C'est le point central de l'architecture : **un dossier de chaque côté, et
rien d'autre à toucher.**

### Côté API — `backend/src/modules/<nom>/module.js`

```js
import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stmt } from '../../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  // req.user est disponible : { id, username, display_name }
  res.json(stmt('SELECT * FROM ma_table').all());
});

export default {
  name: 'budget',
  basePath: '/api/budget',
  router,
  // Facultatif — les .sql du dossier sont appliqués au démarrage, une seule fois.
  migrationsDir: path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations'),
  // Facultatif — exécuté après les migrations (initialisation, données de départ…).
  init: async () => {},
};
```

L'authentification est appliquée **par défaut**. Un module public doit le
demander explicitement avec `requiresAuth: false` : l'oubli ferme l'accès, il
ne l'ouvre jamais.

### Côté interface — `frontend/src/modules/<nom>/index.js`

```js
import BudgetPage from './BudgetPage.jsx';

export default {
  id: 'budget',
  label: 'Budget',
  description: 'Les dépenses du mois',
  path: '/budget',
  Component: BudgetPage,
};
```

La route protégée et la tuile du tableau de bord apparaissent automatiquement.

---

## Avancement

- [x] **Étape 1 — Socle** : arborescence, conteneurs, migrations, chargeur de
      modules, configuration.
- [x] **Étape 2 — Authentification** : comptes créés depuis l'environnement,
      connexion par cookie de session, tableau de bord, page compte, PWA
      installable.
- [x] **Étape 3 — Liste de courses** : premier module, interface mobile,
      mises à jour optimistes.

Pistes pour la suite : calendrier partagé, budget, liste de tâches — chacune
suit le mode d'emploi ci-dessus. Côté liste de courses, les évolutions
naturelles seraient les rayons, les articles récurrents, et le temps réel
(SSE) à la place du rafraîchissement au retour sur l'application.
