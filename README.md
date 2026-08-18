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

Une **barre d'onglets** en bas de l'écran mène à chacun d'un seul tap — passer
des courses aux tâches ne repasse plus par le tableau de bord. Elle est déduite
du registre : déposer un dossier de module l'y fait apparaître.

Cinq onglets tiennent côte à côte sur un téléphone. Tant que tout tient,
l'accueil ouvre la marche ; au-delà, il cède sa place à un onglet « Plus » qui
mène au tableau de bord, lequel les liste tous.

Le champ `tabOrder` d'un module fixe son **rang d'affichage** — la même règle
sert aux tuiles du tableau de bord et aux onglets, deux listes des mêmes modules
dans deux ordres différents obligeant à réapprendre où regarder selon l'écran.
Il décide aussi qui reste visible quand la barre déborde ; sans lui, c'est
l'ordre alphabétique qui tranche, et le module le plus utilisé peut se retrouver
masqué. Aujourd'hui : courses, tâches, menus, calendrier — le frigo se consulte
depuis « Plus ».

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

### Frigo — `/frigo`

Ce qu'il reste, et surtout ce qui va se perdre. La page met en tête un bandeau
listant les produits périmés ou à consommer sous trois jours — c'est là que se
joue l'intérêt du module.

- les produits sont triés par échéance la plus proche, ceux sans date fermant
  la marche ;
- chaque ligne porte un badge d'échéance lisible (« Périmé hier », « Demain »,
  « Dans 2 j », puis la date) ;
- le champ d'ajout propose des raccourcis de date (3 jours, 1 semaine, 1 mois,
  ou date précise) et **conserve la date choisie** d'un produit au suivant, pour
  saisir d'affilée les courses qui périment le même jour ;
- toucher une ligne déplie l'édition de la date et les actions secondaires ;
- `−` à quantité 1 sort le produit du frigo, comme dans la liste de courses.

Les dates sont interprétées **côté navigateur**, avec la date locale du
téléphone : c'est celle de la personne qui ouvre le frigo qui fait foi, et cela
évite d'avoir deux logiques de calendrier.

| Route | Effet |
| --- | --- |
| `GET /api/fridge/items` | Contenu, trié par échéance |
| `POST /api/fridge/items` | Ajout (`name`, `quantity`, `expiresOn` facultatifs) |
| `PATCH /api/fridge/items/:id` | Modification — `expiresOn: null` retire la date |
| `DELETE /api/fridge/items/:id` | Retrait du produit |

**Passerelle vers la liste de courses** : un produit épuisé s'envoie dans les
courses depuis les actions dépliées. Le bouton n'apparaît que si le module
courses répond côté API, et le lien se limite à un appel HTTP — voir
[Faire dialoguer deux modules](#faire-dialoguer-deux-modules).

### Calendrier — `/calendrier`

Agenda chronologique du foyer : les événements à venir, groupés par jour, avec
en-tête de jour collant pendant le défilement.

- chaque événement est attribué à l'un de vous ou à tout le monde, avec une
  **bande de couleur** qui permet de voir qui est pris avant même d'avoir lu ;
- les événements sur la journée entière remontent en tête de leur journée, les
  autres suivent par heure ;
- un **séjour sur plusieurs jours** apparaît dans chaque journée qu'il couvre,
  avec son rang (« jour 2/4 ») ;
- la saisie se fait dans un panneau glissé depuis le bas — un calendrier
  demande trop de champs pour le champ unique des autres modules ;
- toucher un événement rouvre ce panneau pour le modifier ou le supprimer.

Les événements sont **ponctuels** : pas de récurrence, choix assumé pour
l'instant. Seuls les événements à venir sont affichés ; le passé reste en base.

Les événements s'attribuent aux [membres du foyer](#les-membres-du-foyer), que
l'on gère en touchant la bande de couleurs en haut de l'agenda.

| Route | Effet |
| --- | --- |
| `GET /api/calendar/events?from=&to=` | Événements **chevauchant** la période (défaut : un an à partir d'aujourd'hui) |
| `POST /api/calendar/events` | Création |
| `PATCH /api/calendar/events/:id` | Modification |
| `DELETE /api/calendar/events/:id` | Suppression |

Date et heure sont stockées séparément : `startsAt` à `null` signifie « journée
entière », ce qu'un horodatage à minuit ne saurait exprimer sans ambiguïté. Les
règles de cohérence (fin après début, heure de fin sans heure de début) portent
sur les champs pris ensemble : une modification partielle est donc fusionnée
avec l'événement existant avant d'être validée.

### Menus — `/menus`

Ce qu'on mange cette semaine, du lundi au dimanche, midi et soir. Le module
ferme la boucle **frigo → menus → courses**.

- une case porte **soit une recette, soit un texte libre** — « restes »,
  « resto », « chez mes parents ». La moitié des dîners d'une vraie semaine ne
  sont pas des recettes, et obliger à créer une fiche pour cela condamnerait le
  planning à rester vide ;
- les recettes vivent dans un répertoire réutilisable, avec leurs ingrédients ;
- les **quantités sont du texte libre** — « 200 g », « 2 gousses », « un filet ».
  Normaliser les unités demanderait une table de conversions et une saisie plus
  lourde, pour un bénéfice nul : personne n'additionne deux cuillères à soupe ;
- un bouton envoie les ingrédients de la semaine dans la liste de courses, après
  les avoir montrés **tels qu'ils y arriveront** — on décoche l'huile d'olive
  qu'on a déjà avant d'envoyer, pas après ;
- supprimer une recette la retire des repas prévus, ce que l'interface annonce.

Un ingrédient présent dans deux recettes n'est cité qu'une fois, ses quantités
juxtaposées : « Crème (20 cl + un filet) ». Elles ne sont pas additionnées —
c'est la conséquence assumée du texte libre, et de toute façon la somme de
« 2 gousses » et « un peu » n'existe pas.

| Route | Effet |
| --- | --- |
| `GET /api/menus/plan?from=&to=` | Repas prévus sur la période |
| `PUT /api/menus/plan/:date/:slot` | Pose un repas (`recipeId` **ou** `freeText`) |
| `DELETE /api/menus/plan/:date/:slot` | Vide la case |
| `GET /api/menus/recipes` | Le répertoire, sans les ingrédients |
| `GET /api/menus/recipes/:id` | Une recette et ses ingrédients |
| `POST /api/menus/recipes` | Création |
| `PATCH /api/menus/recipes/:id` | Modification — `ingredients` remplace la liste entière |
| `DELETE /api/menus/recipes/:id` | Suppression, renvoie le nombre de repas retirés |
| `GET /api/menus/ingredients?from=&to=` | Ingrédients de la période, regroupés par nom |

`PUT` et non `POST` sur une case : c'est une ressource adressable dont on fixe
le contenu, et poser deux fois le même repas au même endroit doit donner le même
résultat.

**Passerelle vers la liste de courses** : le bouton d'envoi n'apparaît que si le
module courses répond côté API, et le lien se limite à un appel HTTP — même
modèle que le frigo, voir [Faire dialoguer deux modules](#faire-dialoguer-deux-modules).

### Tâches — `/taches`

Une liste unique, triée par échéance la plus proche, avec un filtre par
personne en haut d'écran.

- une tâche peut avoir une **échéance** et un **rythme** (chaque jour, semaine,
  mois, année) ;
- cocher une tâche récurrente ne la termine pas : elle **se replanifie** à
  l'échéance suivante, et l'application l'annonce — sans ce message, on croirait
  qu'il ne s'est rien passé ;
- la replanification vise toujours une date future : une tâche hebdomadaire
  cochée avec trois semaines de retard repart sur la prochaine occurrence, pas
  sur une date déjà passée ;
- les tâches faites basculent dans une section repliable, avec purge à
  confirmation en deux temps ;
- ce qui est en retard est signalé en rouge.

| Route | Effet |
| --- | --- |
| `GET /api/tasks/items?status=pending\|done\|all` | Tâches et compteurs |
| `POST /api/tasks/items` | Création |
| `PATCH /api/tasks/items/:id` | Modification — `done: true` replanifie une tâche récurrente et renvoie `rescheduled` |
| `DELETE /api/tasks/items/completed` | Purge des tâches faites |
| `DELETE /api/tasks/items/:id` | Suppression |

Le calcul d'échéance repart toujours de la date d'origine plutôt que de la
précédente valeur calculée. C'est ce qui évite la dérive d'une tâche mensuelle
tombant le 31 : en enchaînant les additions, elle serait ramenée au 28 en
passant par février, puis y resterait.

---

## Les membres du foyer

Le foyer compte des personnes qui n'ont pas à se connecter — enfants, animaux —
mais à qui l'on rattache des rendez-vous et des corvées. Leur créer un compte
leur donnerait un mot de passe et un accès à l'application : **les membres du
foyer sont donc distincts des comptes**, et appartiennent au socle
(`backend/src/lib/people.js`, `frontend/src/lib/people.js`) puisque le
calendrier comme les tâches s'y réfèrent.

La liste se gère depuis le calendrier ou les tâches, bouton « Gérer ». Les
titulaires d'un compte y apparaissent automatiquement, marqués « Compte », et
ne peuvent pas être retirés — ils reviendraient au démarrage suivant. Un compte
créé plus tard est ajouté de lui-même. Retirer quelqu'un ne supprime ni ses
événements ni ses tâches : ils passent sur « tout le monde ».

| Route | Effet |
| --- | --- |
| `GET /api/people` | Liste |
| `POST /api/people` | Ajout d'une personne sans compte |
| `PATCH /api/people/:id` | Renommage |
| `DELETE /api/people/:id` | Retrait (refusé pour un titulaire de compte) |

Un module qui veut attribuer ses objets à quelqu'un référence `people(id)` avec
`ON DELETE SET NULL`, importe `personExists` côté API et `usePeople` côté
interface. Il n'a jamais à connaître les autres modules.

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

**L'application se sauvegarde toute seule**, chaque nuit à 3 h, et au démarrage
s'il n'existe pas déjà une sauvegarde du jour — c'est justement après un
déploiement qu'une image récente est la plus utile. Les 14 dernières sont
conservées, les plus anciennes retirées automatiquement. Rien à installer.

Les fichiers atterrissent dans `data/backups/`, nommés `minka-AAAA-MM-JJ.db`.
Réglages dans [`.env.example`](.env.example) : heure, nombre conservé,
destination, ou désactivation.

Vérifier l'état, ou déclencher une sauvegarde avant une manipulation risquée :

```bash
curl -s -b cookies.txt https://minka.<domaine>/api/backup
```

```bash
docker compose logs minka-api | grep backup
```

### Ce que cela protège, et ce que cela ne protège pas

Par défaut les sauvegardes vivent dans le même volume que la base : cela couvre
les fausses manœuvres et les migrations ratées, **pas une panne de disque**.
Pour les éloigner, monter un autre share dans le service `minka-api` (le
`docker-compose.yml` contient la ligne à décommenter) et pointer `BACKUP_DIR`
dessus.

### Restaurer

```bash
cd /mnt/user/appdata/minka
docker compose stop minka-api
cp -a data/backups/minka-2026-08-17.db data/minka.db
rm -f data/minka.db-wal data/minka.db-shm
docker compose start minka-api
```

Les fichiers `-wal` et `-shm` sont retirés : ce sont les journaux de l'ancienne
base, sans rapport avec celle qu'on vient de remettre en place. Une sauvegarde
produite par `VACUUM INTO` est un fichier complet et autonome, qui n'en a pas
besoin.

### Pourquoi `VACUUM INTO` et non une copie de fichier

La base tourne en mode WAL : les écritures récentes vivent dans
`minka.db-wal` tant qu'elles n'ont pas été consolidées. Copier `minka.db` seul
donne une image tronquée — le piège s'est refermé pendant le développement, sur
une base dont le fichier principal ne pesait que 4 Ko contre 288 Ko de journal.
`VACUUM INTO` écrit une base complète et cohérente, sans interrompre le service.

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

### Tests

Le calcul des dates est la seule logique du projet qu'une erreur rend à la fois
silencieuse et coûteuse : une tâche mensuelle qui dérive, un séjour affiché au
mauvais rang, un produit signalé périmé la veille. C'est donc ce qui est
couvert, avec le lanceur intégré de Node — **aucune dépendance à installer**.

```bash
cd backend && npm test
```

```bash
cd frontend && npm test
```

Côté API : la replanification des tâches récurrentes
(`modules/tasks/recurrence.js`) et le contrat de module (`modules/loader.js`).
Côté interface : `lib/dates.js`, `lib/collection.js` — les opérations de liste
et le suivi des quantités sur lesquels repose `useCollection` — et la logique
pure de chaque module : échéances du frigo, agenda du calendrier, échéances des
tâches.

Les fichiers testés sont volontairement séparés de tout accès à la base ou au
DOM. C'est ce qui permet à `node --test` de les charger tels quels : un test qui
importerait `service.js` ouvrirait une connexion SQLite, et donc créerait un
fichier de base, pour vérifier une addition de dates.

Un test vit à côté du code qu'il vérifie, dans le dossier de son module — un
module reste ainsi entier dans son dossier, tests compris.

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

Le `basePath` doit être de la forme `/api/<nom>` — un seul segment, en
minuscules. Deux modules ne peuvent partager ni leur `name` ni leur `basePath` :
l'API refuse alors de démarrer en nommant les deux dossiers fautifs. Ces
collisions ne provoquent aucune erreur d'elles-mêmes, et c'est précisément le
problème — deux `basePath` identiques et Express sert le premier routeur monté,
deux `name` identiques et les migrations du second passent pour appliquées, donc
sa table n'est jamais créée.

### Côté interface — `frontend/src/modules/<nom>/index.js`

```js
import BudgetPage from './BudgetPage.jsx';
import { BudgetIcon } from './BudgetIcon.jsx';

export default {
  id: 'budget',
  label: 'Budget',
  description: 'Les dépenses du mois',
  path: '/budget',
  Component: BudgetPage,
  Icon: BudgetIcon,      // facultatif
  shortLabel: 'Budget',  // facultatif — libellé de l'onglet, si `label` est long
  tabOrder: 3,           // facultatif — rang d'affichage, tuile comme onglet
};
```

La route protégée, la tuile du tableau de bord **et l'onglet de navigation**
apparaissent automatiquement. L'icône vit dans le dossier du module (voir
`modules/fridge/FridgeIcon.jsx`) : ajouter une fonctionnalité n'oblige à
modifier aucun fichier commun.

Là aussi, deux modules ne peuvent partager ni leur `id` ni leur `path`. Le
second est écarté du registre avec un message en console, plutôt que de faire
échouer toute l'interface : un module mal déclaré ne doit pas emporter le reste
de l'application.

### Ancrer un élément en bas de l'écran

La barre d'onglets occupe le bas de l'écran. Un module qui y ancre quelque chose
— champ d'ajout, bouton flottant — se pose sur **`bottom-onglets`** plutôt que
sur `bottom-0`, et n'a ainsi aucune hauteur à connaître :

```jsx
<div className="bottom-onglets fixed inset-x-0 z-20 …">
```

Inutile d'y ajouter `pb-safe` : la barre réserve elle-même la marge de gestes du
téléphone. Le socle pose déjà `pb-onglets` sur le contenu défilant, il n'y a donc
rien à faire pour que la fin d'une liste reste atteignable.

Les couches, du fond vers la surface : `z-20` pour ce qu'un module ancre en bas,
`z-30` pour la barre, `z-40` pour les panneaux glissés — un panneau ouvert
couvre la navigation, qui n'a alors plus lieu d'être visible.

### Ce que le socle met à disposition

Côté API : `isoDate` et `isoTime` (`src/lib/schemas.js`), validateurs de date et
d'heure qui vérifient l'existence réelle du jour, pas seulement le format.

Côté interface : `lib/dates.js` (`aujourdhui`, `decalerJours`, `joursEntre`) —
tous les calculs y passent par UTC, car comparer des jours en heure locale fait
gagner ou perdre une journée aux changements d'heure.

### Les aides fournies par le socle

`useCollection(charger)` — **le point de départ d'un module qui tient une
liste partagée.** Il apporte le chargement, l'état d'erreur, le rafraîchissement
au retour sur l'application, et surtout les actions optimistes : `ajouter`,
`modifier`, `retirer`, `retirerPlusieurs`, chacune restaurant l'état d'origine
si le serveur refuse — un élément retiré revenant exactement à sa place.

```js
const charger = useCallback(async () => {
  const data = await budgetApi.list();
  return { elements: data.expenses, extra: data.total };
}, []);

const { elements, status, error, modifier } = useCollection(charger);
```

`charger` renvoie `{ elements, extra }` et doit passer par `useCallback`, sans
quoi la liste se rechargerait à chaque rendu. `extra` accueille ce qui
accompagne la liste sans en faire partie — les compteurs d'en-tête, un total.
Les appels passés aux actions renvoient de même `{ element, extra }` : c'est le
seul endroit où un module traduit la forme de son API vers celle du hook.

L'option `appelQuantite` ajoute un pas de quantité résistant aux taps rapides et
aux réponses arrivant dans le désordre (voir les courses et le frigo).

Le socle le propose, il ne l'impose pas : un module dont les besoins diffèrent
garde son propre état.

`useRefreshOnFocus(rafraichir)` — recharge les données au retour sur
l'application, ce qui suffit à voir ce que l'autre a saisi sans temps réel. À
préférer à un `useEffect` maison : `visibilitychange` et `focus` ne couvrent pas
les mêmes situations et le détail se rate facilement. Déjà inclus dans
`useCollection`.

`useServerModule('shopping')` — indique si un autre module est monté côté API.

### Faire dialoguer deux modules

Un module qui veut proposer une passerelle vers un autre ne doit pas importer
son code. Le frigo, qui envoie un produit dans la liste de courses, sert de
modèle :

```js
const coursesDisponibles = useServerModule('shopping');
// …puis un simple appel HTTP, sans import du module courses :
api.post('/shopping/items', { name });
```

Le lien se limite au contrat d'API publique. Si le module courses disparaît, le
bouton s'éteint de lui-même et rien ne casse. La présence est vérifiée auprès de
`/api/health`, et non du registre du frontend : c'est bien l'API distante qu'on
va appeler, et interroger le registre depuis un module qu'il vient lui-même de
charger créerait un cycle d'imports.

---

## Avancement

- [x] **Étape 1 — Socle** : arborescence, conteneurs, migrations, chargeur de
      modules, configuration.
- [x] **Étape 2 — Authentification** : comptes créés depuis l'environnement,
      connexion par cookie de session, tableau de bord, page compte, PWA
      installable.
- [x] **Étape 3 — Liste de courses** : premier module, interface mobile,
      mises à jour optimistes.

- [x] **Module Frigo** : inventaire, dates de péremption, passerelle vers la
      liste de courses.
- [x] **Module Calendrier** : agenda partagé, attribution par personne,
      séjours sur plusieurs jours.
- [x] **Membres du foyer** remontés dans le socle, partagés par le calendrier
      et les tâches.
- [x] **Module Tâches** : échéances, tâches récurrentes qui se replanifient,
      filtre par personne.
- [x] **Sauvegarde automatique** : nocturne, avec rotation.
- [x] **Tests** : logique de dates et contrat de module, avec `node --test`.
- [x] **`useCollection`** : le cycle « liste partagée, actions optimistes »
      remonté dans le socle, partagé par les courses, le frigo et les tâches.
- [x] **Barre d'onglets** : un tap pour passer d'un module à l'autre, déduite
      du registre.
- [x] **Module Menus** : planning de la semaine, recettes, et envoi des
      ingrédients dans la liste de courses.

Pistes pour la suite : budget, notes partagées — chacun suit le mode d'emploi
ci-dessus. Côté liste de courses, les évolutions naturelles seraient les rayons,
les articles récurrents, et le temps réel (SSE) à la place du rafraîchissement
au retour sur l'application. Côté calendrier, les événements récurrents et un
flux ICS en lecture seule, pour s'abonner depuis l'application native du
téléphone. Une notification à l'approche d'une date de péremption ou d'un
rendez-vous supposerait d'ajouter le push web (VAPID), non configuré à ce jour.
