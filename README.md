# Minka

> **English:** to deploy an English-speaking instance, see
> [README.en.md](README.en.md).

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
masqué. Aujourd'hui : courses, tâches, menus, calendrier — le frigo et les
recettes se consultent depuis « Plus ».

### Liste de courses — `/courses`

Une seule liste, partagée par toute la maison. Pensée pour être utilisée d'une
main, en marchant dans les rayons :

- le champ d'ajout est **ancré en bas de l'écran** et garde le focus après
  chaque envoi, pour enchaîner les articles sans reposer le pouce ;
- toucher une ligne coche l'article — la zone tactile occupe toute la largeur ;
- les commandes `−` / `+` ajustent la quantité ; à 1, le `−` devient une
  corbeille, ce qui évite un bouton de plus sur la ligne ;
- les articles à acheter sont **regroupés par rayon**, dans l'ordre du parcours
  en magasin ; les rayons vides ne s'affichent pas, et l'ordre d'ajout est
  conservé à l'intérieur d'un rayon ;
- le classement se fait **côté serveur, à l'ajout**, d'après un dictionnaire
  d'environ quatre cents produits courants livré avec le code
  (`modules/shopping/rayons.js`) : les articles poussés par le frigo et par les
  menus arrivent donc rangés eux aussi, sans rien savoir des rayons. Une
  instance anglaise a le sien (`rayons.en.js`, à côté de `rayons.fr.js`), lu
  dans l'autre sens — le nom principal vient en dernier en anglais, « apple
  juice » est du jus — et avec quelques mots qui décident seuls : « frozen
  peas » est au surgelé, « tinned tomatoes » en épicerie ;
- un **appui long** sur une ligne — ou un clic droit — ouvre « Ranger dans… ».
  La correction **est retenue** sous une forme normalisée du nom (« Lait de
  coco », « 2 laits de coco » et « lait de coco (400 ml) » n'en font qu'une), et
  elle range du même coup les autres articles du même produit déjà en liste ;
- les rayons sont **figés dans le code**, une douzaine : pas de table, pas
  d'écran de gestion. C'est le pari inverse des catégories de budget, et pour
  une raison précise — ajouter « vétérinaire » à un budget est propre à chaque
  foyer, les rayons d'un supermarché ne le sont pas ;
- les articles cochés basculent dans une section **Déjà pris** repliable, avec
  un bouton de purge à confirmation en deux temps ;
- toutes les actions sont **optimistes** : l'affichage réagit immédiatement et
  se corrige tout seul si le serveur refuse, ce qui rend l'application utilisable
  avec une connexion défaillante ;
- la liste se rafraîchit au retour sur l'application, ce qui suffit à voir les
  ajouts de l'autre sans recharger la page.

| Route | Effet |
| --- | --- |
| `GET /api/shopping/items?status=pending\|completed\|all` | Liste, compteurs et rayons |
| `POST /api/shopping/items` | Ajout (`name`, `quantity` facultatif) — le rayon est déduit |
| `PATCH /api/shopping/items/:id` | Modification (`name`, `quantity`, `completed`, `rayon`) |
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

### Budget — `/budget`

Où part l'argent du mois. Un total en haut, la répartition par catégorie, puis
le détail.

- la saisie ne demande que **le montant et deux mots** — la date vaut
  aujourd'hui, la catégorie et la personne se précisent plus tard en touchant la
  ligne. Noter une dépense doit tenir en trois secondes, au moment où l'on range
  le ticket ;
- une dépense saisie en consultant un mois passé s'y range : c'est qu'on
  rattrape un oubli, pas qu'on dépense aujourd'hui ;
- le **plafond mensuel d'une catégorie est facultatif** : on veut souvent savoir
  ce qu'on met dans les restaurants sans se fixer de limite. Sans plafond, la
  catégorie compte sans juger ; avec, une jauge se remplit et vire au rouge une
  fois dépassée ;
- `person_id` dit qui a payé, et rien de plus. **Aucun calcul de dettes** — pour
  un foyer aux finances communes, « qui doit combien à qui » est du bruit.

| Route | Effet |
| --- | --- |
| `GET /api/budget/expenses?from=&to=` | Dépenses de la période, et totaux |
| `POST /api/budget/expenses` | Création |
| `PATCH /api/budget/expenses/:id` | Modification |
| `DELETE /api/budget/expenses/:id` | Suppression |
| `GET /api/budget/categories` | Les catégories |
| `POST /api/budget/categories` | Création — refuse un nom déjà pris |
| `PATCH /api/budget/categories/:id` | Renommage, plafond |
| `DELETE /api/budget/categories/:id` | Suppression, renvoie le nombre de dépenses désétiquetées |

**Les montants sont des entiers de centimes**, de la base au navigateur. SQLite
n'a pas de type décimal et les flottants finissent toujours par se voir : un
total de fin de mois faux d'un centime est un total faux. La lecture de « 12,50 »
se fait sur les chiffres eux-mêmes, jamais par un `parseFloat` — `Math.round`
sur `12.345 * 100` donne 1234, et personne ne s'en aperçoit avant de faire la
somme.

Les totaux sont calculés par SQLite, pas dans le navigateur : refaire la somme
de son côté finirait par diverger de celle faite en base, et deux écrans
donneraient deux chiffres.

Supprimer une catégorie ne supprime pas ses dépenses : elles restent comptées et
passent en « Sans catégorie ». L'interface l'annonce avant de confirmer.

### Entretien — `/entretien`

Le planning de la maison : ce qui se détartre, se change, se vérifie et se
range, pièce par pièce. **59 interventions sont posées au premier démarrage**,
d'après l'inventaire du foyer — à retirer, compléter et re-rythmer ensuite.

- l'écran s'ouvre sur l'urgence — *En retard*, *Cette semaine*, *Plus tard* —
  parce que c'est la question qu'on se pose en l'ouvrant ;
- un filtre par pièce sert l'autre façon de s'y prendre : « aujourd'hui je fais
  la salle de bain » ;
- le retard se dit en jours, puis en semaines, puis en mois. « En retard de
  87 j » ne parle à personne ; « en retard de 3 mois » se comprend ;
- « Pas maintenant » repousse d'une semaine ou d'un mois **sans déclarer le
  geste fait**. Sans cette porte de sortie, on finit par cocher pour faire taire
  la ligne, et le planning ne veut plus rien dire.

**La règle qui distingue l'entretien d'une tâche** : une tâche se replanifie
depuis son échéance, une intervention depuis **le jour où on l'a faite**.
« Sortir les poubelles » vise le mardi — cocher avec trois jours de retard ne
déplace pas le mardi suivant. « Détartrer la machine tous les mois » vise un
intervalle depuis le dernier détartrage : le faire avec six semaines de retard
décale d'autant la fois suivante, sinon la ligne ressortirait en retard le jour
même.

| Route | Effet |
| --- | --- |
| `GET /api/entretien/tasks` | Le planning et les pièces |
| `POST /api/entretien/tasks` | Ajout |
| `PATCH /api/entretien/tasks/:id` | Réglage (pièce, rythme, échéance, personne) |
| `POST /api/entretien/tasks/:id/done` | C'est fait — replanifie depuis ce jour |
| `POST /api/entretien/tasks/:id/snooze` | Repousse sans déclarer fait |
| `DELETE /api/entretien/tasks/:id` | Retrait du planning |
| `GET`/`POST`/`PATCH`/`DELETE` `/api/entretien/zones[/:id]` | Les pièces |

Les premières échéances sont **étalées** sur la période de chaque rythme : rien
n'est dû le premier jour, et la maison se met en route à raison d'environ une
intervention par jour le premier mois. Tout poser à la même date afficherait
cinquante-neuf retards d'entrée de jeu, de quoi refermer le module pour de bon.

Supprimer une pièce ne supprime pas ses interventions : elles restent, sans
rattachement.

### Menus — `/menus`

Ce qu'on mange cette semaine, du lundi au dimanche, midi et soir. Le module
ferme la boucle **frigo → menus → courses**, en s'appuyant sur le répertoire du
[module Recettes](#recettes--recettes).

- une case porte **soit une recette, soit un texte libre** — « restes »,
  « resto », « chez mes parents ». La moitié des dîners d'une vraie semaine ne
  sont pas des recettes, et obliger à créer une fiche pour cela condamnerait le
  planning à rester vide ;
- **un seul champ** remplit une case, et trois façons de s'en servir : on tape
  et la liste des recettes se filtre, on en touche une ; on pose le texte tel
  quel ; ou l'on en fait une recette d'un tap — créée avec son seul intitulé,
  parce que planifier la semaine n'est pas le moment de dresser une liste
  d'ingrédients. Un champ et non deux, parce que la frontière entre chercher et
  écrire ne se décide qu'après avoir tapé : on ne sait pas toujours en
  commençant si « poulet basquaise » est déjà au répertoire ;
- une case qui porte une recette **mène à sa fiche d'un tap**, par la casserole
  au bout de sa ligne, et la refermer ramène au planning — plutôt que de
  retenir l'intitulé, passer par « Plus » et le chercher dans le répertoire.
  La ligne, elle, sert toujours à changer le repas : on planifie une fois par
  semaine, mais on vient chaque jour voir ce qu'il y a à préparer, et le geste
  courant a sa propre cible, comme le bouton « fait » de l'entretien ;
- sur la semaine en cours, la page s'ouvre **centrée sur aujourd'hui**, et y
  revient au retour d'une fiche : c'est la question qu'on vient lui poser, et
  du jeudi au dimanche la réponse tombait hors de l'écran. Le rafraîchissement
  du retour sur l'application, lui, ne déplace pas la page sous le doigt ;
- un bouton envoie les ingrédients de la semaine dans la liste de courses, après
  les avoir montrés **tels qu'ils y arriveront** — on décoche l'huile d'olive
  qu'on a déjà avant d'envoyer, pas après ;
- supprimer une recette **ne vide plus les repas prévus** : ils gardent son
  intitulé et perdent seulement leur fiche. Ranger le répertoire ne doit pas
  trouer la semaine en cours.

**Une case porte l'intitulé recopié** au moment de la pose, et un `recipe_id`
qui n'est qu'un pointeur souple — sans clé étrangère, les deux tables
appartenant à deux modules. C'est ce qui rend l'extraction viable : le planning
s'affiche entier sans jamais interroger le module recettes, et survit à son
retrait. Quand le répertoire répond, c'est **son** titre qui l'emporte —
renommer une recette se voit dans les semaines déjà posées.

Sans le module recettes, le planning reste un agenda de repas écrits à la main.
C'est déjà la moitié d'une vraie semaine.

**Réorganiser la semaine** se fait d'un geste, sans rien perdre : « ce soir,
resto » ne coûte plus la fin de semaine à refaire.

- une **poignée** au bout de chaque repas l'emporte jusqu'à une autre case.
  Pendant le geste, le repas suit le doigt en annonçant l'issue — « jeudi 8
  soir · pousse « Chili » » —, la case visée s'éclaire, et la page défile seule
  quand on approche d'un bord ;
- **touchée sans être glissée**, la poignée ouvre « Déplacer… », qu'on trouve
  aussi dans le panneau d'une case : on touche ensuite la case d'arrivée, au
  besoin dans une autre semaine. C'est aussi le chemin du clavier et du lecteur
  d'écran ;
- **« Décaler d'un jour »**, dans le panneau, envoie le repas au lendemain. Le
  panneau reste ouvert sur la case vidée, et le resto tient en deux touchers :
  décaler, puis « Resto » ;
- tant que le champ du panneau est vide, les **raccourcis** — les textes libres
  que le foyer écrit le plus souvent sur huit semaines, complétés par « Restes »
  et « Resto » — se posent d'un tap ;
- chaque réorganisation laisse **huit secondes pour annuler**, ce qui vaut mieux
  qu'une confirmation avant chaque geste.

Glisser, poser par « Déplacer… » et décaler obéissent à **une seule règle,
« insérer et pousser »** : la case de départ se libère, le repas prend la case
d'arrivée, et celui qu'il déloge glisse d'un jour sur le même créneau — un dîner
reste un dîner —, jusqu'à la première case libre. Celle-ci peut être la case quittée, quand un repas
remonte sa propre chaîne, ou un jour de la semaine suivante : rien ne se perd.
Le prix de la règle : échanger le midi et le soir d'un même jour ne se fait plus
d'un geste, puisque le dîner délogé part au lendemain soir — c'est ce que
rattrape l'annulation.

**Le serveur tranche, l'interface prédit.** La poussée peut franchir le
dimanche, que la page n'a pas chargé, et doit partir de l'état réel du planning,
sur lequel l'autre a pu poser un repas depuis : c'est le serveur qui l'applique,
dans une transaction. La page applique d'abord la même règle à ce qu'elle voit,
pour l'affichage optimiste, puis la réponse, qui fait foi — sans en garder ce
qui tombe hors de la semaine affichée. La fonction est donc recopiée des deux
côtés, `reorganisation.js` dans le module de l'API comme dans celui de
l'interface, et leurs tests déroulent les mêmes scénarios : si l'une change,
l'autre doit suivre.

Les deux routes d'écriture rendent chaque case touchée avec son état d'avant et
d'après. **Annuler** rétablit le premier en attendant le second : si l'autre a
touché une de ces cases entre-temps, le serveur refuse tout plutôt que
d'effacer son geste sans que personne le sache.

**Importer une semaine**, enfin. Le chemin ordinaire est désormais le
[connecteur Claude](#connecteur-claude--apimcp) : Claude lit le planning, le
répertoire et le frigo, et pose lui-même la semaine qu'on a préparée ensemble,
recettes complètes comprises. Le bouton « Importer » de l'en-tête reste pour le
reste — une semaine rédigée ailleurs, ou sans le connecteur. Il accepte un
menu écrit en texte, l'analyse à la frappe et montre **ce qui sera posé**, jour
par jour, avant d'appliquer. Le format reste lisible tel quel — c'est d'abord un
menu qu'on lit, accessoirement un texte qu'une machine analyse :

```
Lundi
Midi : Restes
Soir : Gratin de courgettes

Mardi
Soir : Chili sin carne
  - Haricots rouges : 400 g
  - Tomates concassées : 800 g
  - Cumin
```

Les jours s'écrivent en toutes lettres ou abrégés, avec ou sans quantième
(`Lundi`, `lun.`, `Lundi 31 août`) ; les créneaux acceptent `Midi`/`Déjeuner` et
`Soir`/`Dîner` ; la décoration Markdown d'une réponse copiée est ignorée.

Le sort de chaque plat est décidé par le module recettes, selon la règle
[« la recette du foyer fait foi »](#la-recette-du-foyer-fait-foi) — la même pour
l'import texte et pour le connecteur :

- **des ingrédients listés, aucune recette de ce nom → une recette créée**.
  C'est ce qui alimente ensuite la liste de courses ;
- **une recette de ce nom existe → elle est réutilisée**, ce qui permet
  d'écrire « Gratin de courgettes » sans recopier sa liste chaque semaine. Si
  elle n'a pas encore de préparation, les ingrédients listés la complètent ; si
  elle en a une, elle est gardée telle quelle, et le bilan le dit ;
- **pas d'ingrédients, aucune recette connue → un texte libre**, comme
  « restes » ou « chez mes parents ».

Le nom est retrouvé à l'orthographe près — accents, apostrophes, pluriel :
« Gratin de courgette » retrouve « Gratin de courgettes » au lieu d'en créer
une seconde.

L'import se fait en **deux requêtes, deux transactions**. Les plats partent
d'abord au module recettes, qui les retrouve ou les crée et rend leurs
identifiants ; le planning se pose ensuite, d'un bloc. L'ordre compte : si la
première échoue, le planning n'a pas encore bougé, et l'on sait exactement où
l'on en est. Sept allers-retours pour sept jours, eux, laisseraient un planning
à moitié rempli si la connexion lâchait au milieu.

Sans le module recettes, la semaine entière se pose en texte libre : les
ingrédients lus sont perdus, mais le menu est là — et le panneau le dit avant
d'appliquer.

L'import texte ne porte que les ingrédients, pas les étapes : une recette qu'il
crée naît sans préparation. C'est le connecteur qui porte une recette entière.

| Route | Effet |
| --- | --- |
| `GET /api/menus/plan?from=&to=` | Repas prévus sur la période |
| `PUT /api/menus/plan/:date/:slot` | Pose un repas (`title`, plus `recipeId` facultatif) |
| `DELETE /api/menus/plan/:date/:slot` | Vide la case |
| `POST /api/menus/plan/deplacer` | Déplace un repas en poussant ceux qu'il déloge (`de`, `vers`) |
| `PATCH /api/menus/plan` | Fixe plusieurs cases d'un bloc, chacune sous condition de ce qu'elle porte (`attendu`) |
| `GET /api/menus/raccourcis` | Textes libres les plus fréquents du foyer |
| `POST /api/menus/import` | Pose une semaine entière, en une transaction |

`PUT` et non `POST` sur une case : c'est une ressource adressable dont on fixe
le contenu, et poser deux fois le même repas au même endroit doit donner le même
résultat. `PATCH` sur le planning : seules les cases citées changent.

Une réorganisation s'écrit **case par case, par contenu**, plutôt qu'en
déplaçant des lignes : sous `UNIQUE (on_date, slot)`, une ligne avancée d'un
jour heurterait sa voisine avant que celle-ci ait bougé.

L'existence de la recette **n'est pas vérifiée** à la pose, et ne peut pas
l'être : ses tables appartiennent à un autre module. Un identifiant devenu caduc
ne casse rien, il fait retomber la case sur son intitulé — sans casserole, qui
ne mènerait nulle part.

**Passerelles** : le bouton d'envoi aux courses demande les deux modules — celui
qui tient les ingrédients, celui qui les reçoit —, le sélecteur de recettes et
la casserole demandent le premier. Chaque lien se limite à un appel HTTP — même
modèle que le frigo — ou, pour la casserole, à l'adresse d'une page ; voir
[Faire dialoguer deux modules](#faire-dialoguer-deux-modules).

### Recettes — `/recettes`

Le répertoire de ce qu'on sait cuisiner. Il vivait dans le module menus ; il en
est sorti parce qu'une recette a une vie propre — on la lit, on la corrige, on
la cuisine — que le planning de la semaine n'avait pas à porter.

- la liste dit ce qu'il faut pour choisir : le titre, les parts, le nombre
  d'ingrédients ;
- la **recherche fouille les titres et les ingrédients**. « Qu'est-ce que je
  fais avec des courgettes ? » est la question qu'on pose à un répertoire, et
  elle n'a de réponse que si l'on cherche dedans. Quand c'est un ingrédient qui
  a répondu, c'est lui qu'affiche la ligne — sinon la recette paraîtrait là par
  erreur ;
- des **étiquettes libres** — « végétarien », « rapide », « les enfants
  aiment » — filtrent d'un tap. Pas de table d'étiquettes, pas d'écran de
  gestion : une étiquette n'est rien d'autre que son texte, et le vocabulaire
  d'un foyer se construit en écrivant. C'est le pari inverse des rayons de la
  liste de courses, et pour la raison inverse — les rayons d'un supermarché sont
  les mêmes pour tout le monde, « les enfants aiment » n'est vrai que chez soi ;
- toucher une recette ouvre sa **fiche, en lecture**. On ouvre une recette pour
  la lire bien plus souvent que pour la modifier, et un formulaire met tout le
  texte dans des champs de saisie — où il se lit moins bien et se modifie par
  mégarde ;
- les **quantités sont du texte libre** — « 200 g », « 2 gousses », « un filet ».
  Normaliser les unités demanderait une table de conversions et une saisie plus
  lourde, pour un bénéfice nul : personne n'additionne deux cuillères à soupe ;
- supprimer une recette ne touche pas aux repas déjà prévus.

Un ingrédient présent dans deux recettes n'est cité qu'une fois, ses quantités
juxtaposées : « Crème (20 cl + un filet) ». Elles ne sont pas additionnées —
c'est la conséquence assumée du texte libre, et de toute façon la somme de
« 2 gousses » et « un peu » n'existe pas.

#### Le mode cuisine

*Cuisiner* ouvre la recette **en pleine page**, seul écran de l'application à
sortir du gabarit commun — barre d'onglets comprise. Ce n'est pas un formulaire
qu'on remplit avant de revenir à sa liste : c'est là qu'on reste vingt minutes,
les mains occupées.

- **on coche les étapes à mesure**, la ligne entière servant de cible : on vise
  mal avec le dos d'un doigt fariné. Un compteur et une barre disent où l'on en
  est, lisibles du plan de travail ;
- **le texte est plus grand qu'ailleurs.** On lit son téléphone posé à un bras
  de distance, pas à trente centimètres ;
- **les ingrédients sont là, repliés.** On y revient sans cesse — « c'était
  combien de crème ? » — et repartir vers la fiche perdrait la place ;
- **l'écran reste allumé** (`navigator.wakeLock`), et se rendort tout seul en
  quittant. Le verrou étant rendu par le système dès que la page passe en
  arrière-plan, il est redemandé au retour : répondre à un message en pleine
  préparation ne doit pas rendormir l'écran. Là où l'API manque — Safari ancien,
  connexion non chiffrée —, la page le dit plutôt que de promettre en silence.

**La progression vit dans le navigateur**, et nulle part ailleurs. Une séance de
cuisine appartient à qui tient le téléphone : la mettre en base demanderait une
notion de session, une règle pour la clore, et ferait apparaître chez l'autre
des cases cochées qui ne le concernent pas. Le prix est connu et assumé — elle
ne suit pas d'un appareil à l'autre.

Elle survit en revanche à la fermeture de l'application, et **s'oublie au bout
de douze heures** : assez pour une préparation entamée le matin et reprise le
soir, trop peu pour qu'une recette rouverte la semaine suivante s'ouvre à moitié
cochée — ce qui ferait sauter des étapes sans qu'on s'en aperçoive. Elle s'oublie
aussi dès que la recette est réenregistrée : les identifiants d'étapes changent,
et la marche à suivre ayant changé, repartir de zéro est le comportement voulu.

#### Écrire une recette

Les étapes se **saisissent en texte — une ligne, une étape** — et se stockent en
lignes de table. Ce n'est pas une inconséquence : les cocher demande qu'elles
existent séparément et qu'on puisse les désigner ; les écrire demande de pouvoir
en glisser une au milieu sans rien réordonner. Un champ par étape aurait imposé
un mécanisme de déplacement pour un geste qui n'a lieu qu'à la rédaction. La
numérotation collée au texte (« 1. », « - ») est retirée à l'enregistrement,
l'affichage numérotant lui-même.

Le champ `notes` d'avant les étapes est devenu **Remarques** — « se congèle très
bien », « recette de ma mère ». Les préparations déjà saisies n'ont **pas** été
converties par la migration : découper un texte libre au jugé aurait fait d'un
paragraphe de trois phrases trois étapes, et d'une consigne coupée en deux
lignes deux étapes. Le formulaire propose le découpage d'un tap, sur les seules
recettes concernées, et laisse relire avant d'enregistrer.

**Les orthographes d'étiquettes se rejoignent toutes seules.** « vegetarien »
tapé un soir reprend l'orthographe de « Végétarien » écrit le mois dernier —
même règle qu'un titre de recette retrouvé, qui rend celui du répertoire. Sans
elle, deux orthographes feraient deux filtres pour une seule idée et le
répertoire se couperait en morceaux sans que rien ne le signale. Une étiquette
encore inconnue est gardée telle qu'écrite, à ceci près qu'une étiquette **tout
en majuscules** est rendue à sa minuscule : c'est la touche majuscule restée
enfoncée, et elle hurlerait ensuite dans tous les filtres.

#### Importer une recette

Le bouton *Importer* accepte une recette écrite en texte, l'analyse à la frappe
et montre **ce qui sera enregistré** avant de créer quoi que ce soit — une
quantité mal découpée doit se voir là, pas dans la liste de courses la semaine
suivante. Même modèle que l'import d'une semaine de menus, et pour la même
raison.

```
Gratin de courgettes
Pour 4 personnes
Étiquettes : végétarien, four

Ingrédients
- 600 g de courgettes
- Crème fraîche : 20 cl
- 2 gousses d'ail

Préparation
1. Préchauffer le four à 180 °C
2. Émincer les courgettes
```

Le format n'a pas été inventé pour l'occasion : c'est celui sous lequel les
recettes s'écrivent déjà partout. Les **en-têtes de section sont facultatifs** —
sans eux, une ligne à puce est un ingrédient et une ligne numérotée une étape,
ce qui permet de coller ce qu'on a trouvé sans le remettre en forme d'abord.

Les quantités se lisent dans les deux sens : « Crème fraîche : 20 cl », le
format propre à Minka, qui ne laisse rien à deviner et passe en premier ; et
« 20 cl de crème fraîche », celui de tous les livres, reconnu par une liste
d'unités courantes. « 3 œufs » garde « 3 » pour quantité ; « Sel » n'en a pas.
Un nombre de parts ne se lit qu'en tête, avant les sections : « 2 gousses
d'ail » au milieu des ingrédients n'annonce pas une recette pour deux.

Ce qui n'a pas été compris est dit avant d'enregistrer, ligne par ligne, plutôt
que de laisser découvrir ce qui manque.

#### La recette du foyer fait foi

Des recettes arrivent aussi d'ailleurs que du formulaire : l'import d'une semaine
de menus, le connecteur Claude. Quand l'une porte le nom d'une recette déjà au
répertoire, une seule règle décide (`modules/recipes/resolution.js`) :

- une recette qui a **sa préparation** — au moins une étape — a été écrite ou
  relue par quelqu'un de la maison. **Elle n'est pas touchée**, même face à une
  version plus fournie, et l'appelant en est averti. On la corrige en la
  modifiant, pas en la réimportant ;
- une recette **sans préparation** n'est qu'une ébauche — souvent laissée par
  l'import texte, qui ne porte que les ingrédients. La version qui arrive la
  **complète** : ses ingrédients et ses étapes remplacent les anciens, qui vont
  ensemble ; les parts et la remarque ne sont posées que si elles manquaient ;
  les étiquettes s'ajoutent à celles du foyer — « les enfants aiment » ne se
  perd pas parce qu'une proposition ne le savait pas.

Le nom se compare **à l'orthographe près** : sans casse, sans accents, sans
ponctuation, sans le pluriel de chaque mot. « Gratin de courgette » retrouve
« Gratin de courgettes », et le répertoire ne se dédouble plus au gré d'une
proposition écrite un peu autrement. Parmi des doublons nés avant cette règle,
celle qu'on a écrite exactement ainsi passe d'abord, sinon la plus ancienne. La
comparaison vit dans le socle (`lib/titres.js`), le connecteur s'en servant aussi.

| Route | Effet |
| --- | --- |
| `GET /api/recipes/items` | Le répertoire, avec le **nom** des ingrédients, les étiquettes et le nombre d'étapes |
| `GET /api/recipes/items/:id` | Une recette entière |
| `POST /api/recipes/items` | Création |
| `PATCH /api/recipes/items/:id` | Modification — `ingredients`, `steps` et `tags` remplacent la liste entière |
| `DELETE /api/recipes/items/:id` | Suppression |
| `GET /api/recipes/ingredients?ids=1,2,5` | Ingrédients de plusieurs recettes, regroupés par nom |
| `POST /api/recipes/resolve` | Des plats → des identifiants, en créant ou complétant ce qu'il faut |

Le répertoire porte le **nom** des ingrédients — pas leurs quantités, pas les
étapes. C'est ce qu'il faut pour choisir, et surtout pour chercher : le tri et
le filtre se font ensuite dans le navigateur, sans aller-retour à chaque lettre
tapée, et hors ligne comme en ligne. Les étapes n'y sont que comptées
(`stepCount`) : de quoi distinguer une recette achevée d'une ébauche.

Les deux dernières routes existent **pour les autres modules**. `/ingredients` livre le
libellé tout fait — « Crème (20 cl + un filet) » — de sorte que celui qui
l'envoie dans les courses n'a qu'une chaîne à recopier, sans rien savoir de la
forme d'un ingrédient. `/resolve` reçoit des plats — un titre, et tout ce
qu'une recette peut porter — et rend de quoi les désigner, avec le bilan de ce
que la règle ci-dessus en a fait : c'est par là que passent l'import d'une
semaine de menus et le connecteur Claude, sans que ni l'un ni l'autre écrive
jamais dans les tables des recettes. Les plats en reviennent **dans l'ordre où
ils sont partis**, ce qui permet de les recoudre par position.

**Une adresse, aussi, pour les autres modules.** `/recettes?recette=12` ouvre
la page sur la fiche de cette recette : c'est par là que la casserole d'un repas
mène à sa recette, sans que le planning importe rien de ce module. Le paramètre
est retiré de l'adresse aussitôt lu — c'est une consigne, pas un état : resté
là, il rouvrirait au rechargement une fiche qu'on vient de fermer. Refermer la
fiche ramène à la page d'où l'on vient ; ouverte directement par son adresse,
elle se referme sur le répertoire. Une recette introuvable est annoncée par un
bandeau, là où l'ouverture depuis la liste se referme en silence : on a été
envoyé ici pour elle, et un répertoire muet laisserait croire que le lien ne
mène nulle part.

**Les tables ont changé de propriétaire, pas de forme.** `recipes` et
`recipe_ingredients` avaient été créées par la première migration du module
menus ; celle du module recettes les déclare en `CREATE TABLE IF NOT EXISTS` —
rien sur une base en service, tout sur une base neuve ou sur une installation où
le dossier `menus` n'est pas déposé. Réécrire l'histoire pour les retirer de
`menus:001` aurait fait diverger les deux cas.

### Connecteur Claude — `/api/mcp`

Les menus de la semaine se préparent avec Claude, dans un projet claude.ai. Le
connecteur lui ouvre Minka par le protocole MCP : il **lit** ce qu'on a mangé,
le répertoire et le frigo, puis **pose** la semaine dont on est convenus —
recettes entières comprises, étapes, parts et étiquettes, prêtes pour le mode
cuisine. Plus de bloc de texte à coller, plus de recette à reprendre une à une
pour y ajouter sa préparation.

| Outil | Effet |
| --- | --- |
| `lire_planning` | Le planning jour par jour, cases vides comprises. Sans paramètre : les quatre semaines passées, la courante et la suivante, et la date du jour |
| `lister_recettes` | Le répertoire : titres exacts, étiquettes, noms des ingrédients, et si la recette a sa préparation |
| `lire_recette` | Une recette entière |
| `lire_frigo` | Les produits, les dates les plus proches en tête |
| `poser_repas` | Pose jusqu'à quatorze repas, recettes comprises |
| `enregistrer_recette` | Garde une recette au répertoire sans la planifier |
| `modifier_recette` | Réécrit une recette existante — à la demande explicite seulement |

Module sans interface, comme la sauvegarde. Un outil n'est proposé que si le
module dont il dépend est monté : sans frigo, Claude ne voit pas `lire_frigo`.

Sur une instance anglaise ([Langue](#langue)), les outils portent des noms
anglais — `read_meal_plan`, `list_recipes`, `read_recipe`, `read_fridge`,
`plan_meals`, `save_recipe`, `edit_recipe` — et leurs descriptions comme les
instructions sont en anglais. Les champs JSON échangés, eux, restent ceux de
l'API du connecteur (`plat`, `creneau`, `aPreparation`…) : les instructions
anglaises les expliquent. En français, noms, descriptions et instructions sont
ceux qu'un projet Claude connaît déjà ; un test les fige.

**Les garde-fous de l'écriture.** Claude propose d'abord la semaine dans la
conversation, et n'écrit qu'une fois d'accord — c'est la consigne de ses
instructions, et claude.ai demande par défaut l'autorisation avant de se servir
d'un outil. Ensuite :

- **une case déjà occupée n'est jamais écrasée** sans `remplacer: true`, que
  Claude ne passe qu'à la demande : `poser_repas` refuse tout et nomme la case.
  Une case qui porte déjà le même plat — à l'orthographe près — n'est pas un
  conflit : on peut reposer une semaine pour n'en changer qu'un soir ;
- **la recette du foyer fait foi** : une recette qui a sa préparation n'est pas
  réécrite, et le bilan le dit à Claude, qui ne croit pas ses ingrédients
  partis dans les courses ([voir Recettes](#la-recette-du-foyer-fait-foi)) ;
- **le planning se relit avant d'écrire**, et chaque case s'écrit sous
  condition de ce qu'on y a lu — la garde qui protège déjà « Annuler » : si
  l'autre a touché la semaine entre-temps, rien n'est écrit.

**L'accès est délivré par Pocket-ID, pas par Minka.** Claude présente un jeton
que Pocket-ID a signé après une connexion par passkey ; le connecteur en
vérifie la signature, l'émetteur, l'**audience** — un jeton délivré pour une
autre application du foyer, par le même Pocket-ID, n'ouvre pas Minka —,
l'échéance et la permission. `MCP_USERS` rapporte ensuite la personne à son
compte Minka : c'est en son nom que tout est lu et écrit, et c'est aussi la
liste de qui a le droit d'entrer.

Le refus d'un jeton part en 401 **avant** le SDK MCP : une fois un outil lancé,
tout ce qu'il rend est emballé dans un 200, et un 200 ne déclenche jamais la
connexion. L'en-tête `WWW-Authenticate` de ce 401 mène Claude au document de
découverte (RFC 9728), servi sous `/api/mcp/oauth-protected-resource` et non à
la racine du domaine : Claude accepte n'importe quelle adresse à cet endroit, et
une route `/.well-known` à la racine aurait demandé de toucher au nginx du
socle.

**Le connecteur passe par les mêmes routes que l'interface.** Il n'importe le
code d'aucun module et ne lit aucune de leurs tables : il appelle leur API HTTP
en boucle locale (`127.0.0.1`), avec une session signée au nom de la personne.
C'est [Faire dialoguer deux modules](#faire-dialoguer-deux-modules) appliqué
côté serveur — chaque module garde ses règles (validation, « la recette du
foyer fait foi », condition `attendu`), et ce que Claude écrit porte le nom de
qui l'a demandé, comme s'il l'avait tapé.

**Sans état.** Un serveur MCP est construit pour chaque requête puis jeté :
pas de session à expirer, rien à perdre au redémarrage du conteneur. Le SDK
(v2) sert aussi bien les clients d'aujourd'hui que ceux du protocole de 2025,
claude.ai compris.

**Deux textes, deux rôles.** Ce que le connecteur dit de lui-même à chaque
conversation — comment lire Minka, comment y écrire — vit dans
`modules/mcp/instructions.js`, une version par langue, à côté des outils qu'il
décrit, pour ne jamais s'en écarter. Les goûts du foyer — qui mange, ce qu'on
évite, le temps qu'on a, la cantine — sont les instructions du projet Claude :
[`docs/prompt-menus.md`](docs/prompt-menus.md).

#### Mettre le connecteur en service

Sans aucune variable `MCP_*`, le connecteur est éteint et son adresse répond
503 en le disant. À moitié configuré, l'API refuse de démarrer : un connecteur
exposé sur Internet qui vérifierait mal ses jetons serait la pire des trappes.

| Variable | Rôle |
| --- | --- |
| `MCP_RESOURCE_URL` | Adresse publique du connecteur, `https://minka.<domaine>/api/mcp`. C'est aussi l'audience attendue dans les jetons |
| `MCP_ISSUER` | Adresse publique de Pocket-ID, `https://id.<domaine>` |
| `MCP_PERMISSION` | La permission de l'API Minka dans Pocket-ID, par exemple `menus` |
| `MCP_USERS` | `<identifiant Pocket-ID>=<compte Minka>`, séparés par des virgules |
| `MCP_JWKS_URL` | Facultative : les clés de Pocket-ID par son adresse interne, si le conteneur ne joint pas l'adresse publique |

**1. Dans Pocket-ID**, créer un client OIDC « Claude » : client **public**
(sans secret), PKCE activé, adresses de retour
`https://claude.ai/api/mcp/auth_callback` et
`https://claude.com/api/mcp/auth_callback` — Anthropic annonce que la seconde
remplacera un jour la première. Puis, dans **Réglages > API**, créer l'API
« Minka » : identifiant de ressource = `MCP_RESOURCE_URL` exactement, une
permission (`menus`), et l'accès accordé au client « Claude ».

Le client se déclare à la main : Pocket-ID n'offre ni l'enregistrement
automatique des clients, ni, tant qu'on ne l'y autorise pas, l'identité publiée
de Claude.

**2. Dans le `.env`**, renseigner les variables. L'identifiant Pocket-ID d'une
personne est celui qui figure dans l'adresse de sa fiche, dans
l'administration des utilisateurs. À défaut, le journal le donne à la première
connexion refusée :

```
[mcp] sujet inconnu « … » : ajoute-le à MCP_USERS pour lui ouvrir Minka.
```

**3. Redéployer**, puis vérifier :

```bash
docker compose up -d --build
docker logs minka-api 2>&1 | grep '\[mcp\]'
curl https://minka.<domaine>/api/mcp/oauth-protected-resource
```

Le conteneur doit pouvoir joindre Pocket-ID pour y lire ses clés. Si la box ne
renvoie pas vers l'intérieur une adresse publique appelée depuis le réseau local
(« hairpin NAT »), la vérification des jetons échoue : `MCP_JWKS_URL` donne
alors l'adresse interne, `http://IP_UNRAID:1411/.well-known/jwks.json`.

**4. Dans claude.ai**, *Personnaliser → Connecteurs → Ajouter un connecteur
personnalisé* : l'adresse `MCP_RESOURCE_URL`, et dans les réglages avancés
l'identifiant du client « Claude », secret vide. *Se connecter* ouvre
Pocket-ID ; une fois revenu, activer le connecteur dans le projet (menu **+** de
la conversation → *Connecteurs*). Les outils de lecture peuvent être autorisés
une fois pour toutes ; ceux d'écriture gagnent à demander à chaque fois.

Claude appelle depuis les adresses d'Anthropic, `160.79.104.0/21`, aussi bien
Minka que Pocket-ID : une liste d'accès de Nginx Proxy Manager ou une décision
de CrowdSec qui les bloquerait se traduit par « Couldn't reach the MCP server ».

### Notes — `/notes`

Le filet qui rattrape ce que les modules structurés ne prennent pas : codes,
mesures, idées de cadeaux, consignes pour la nounou.

- le **titre est facultatif** — à défaut, la première ligne en tient lieu.
  Personne ne pense à titrer trois lignes notées à la volée ;
- pas de bouton « Enregistrer » : le texte part tout seul après une pause dans
  la frappe, et un indicateur discret dit où en est l'envoi ;
- une note épinglée reste en tête de liste ;
- les autres suivent, de la plus récemment modifiée à la plus ancienne.

| Route | Effet |
| --- | --- |
| `GET /api/notes/items` | Liste, épinglées d'abord |
| `POST /api/notes/items` | Création |
| `GET /api/notes/items/:id` | Une note — sert à retrouver la version courante après un conflit |
| `PATCH /api/notes/items/:id` | Modification — voir ci-dessous |
| `DELETE /api/notes/items/:id` | Suppression |

**Écrire à deux sur la même note.** C'est le seul endroit de l'application où
l'on peut se marcher dessus : ailleurs, chacun coche sa ligne. Une note porte
donc un numéro de `version`, que l'éditeur renvoie à chaque enregistrement. Si
la note a bougé depuis, le serveur refuse d'écrire (`409`) et l'interface pose
la question — garder son texte, ou reprendre celui de l'autre. Perdre trois
lignes sans le savoir serait pire que devoir choisir.

Un numéro plutôt qu'un horodatage : `datetime('now')` a la seconde pour
résolution, et une sauvegarde automatique va plus vite que cela — deux
écritures rapprochées porteraient la même heure et le conflit passerait
inaperçu.

**La version ne garde que le texte.** Épingler n'est pas modifier : compter ce
geste ferait échouer la sauvegarde de celui qui écrit au même moment, et
afficherait « modifiée à l'instant » sur une note qu'on vient seulement de
ranger.

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

## Hors ligne

L'application **s'ouvre et s'affiche sans réseau**. Le service worker garde en
mémoire la dernière réponse de chaque lecture d'API et la ressert quand le
serveur est injoignable : la liste de courses apparaît dans le rayon d'un
magasin sans signal, là où l'on ne voyait qu'une erreur.

Le réseau reste prioritaire — connecté, on voit ce que l'autre vient de
modifier, pas une version d'hier. Le cache n'entre en jeu qu'au bout de quatre
secondes d'attente, ou tout de suite si la requête échoue.

Un bandeau sous l'en-tête annonce alors l'âge des données affichées et prévient
que **les modifications ne passeront pas** : les écritures ne sont pas mises en
file d'attente. Cocher un article hors ligne échouera, et l'affichage se
corrigera de lui-même.

La session survit à l'absence de réseau : elle n'est pas vérifiable hors ligne,
et renvoyer à l'écran de connexion couperait l'accès aux données déjà en cache —
exactement au moment où elles servent. Seule une réponse `401` du serveur, donc
une session réellement terminée, ramène à la connexion. Le cookie reste exigé
dès qu'un appel repart.

Les routes `/api/auth/` ne sont jamais mises en cache : un jeton périmé resservi
ferait croire à une connexion valide.

---

## Palette et polices

Palette « vieux rose » : vieux rose pour la marque, neutres chauds tirés vers la
prune, accents pastel (bleu-gris, lavande, pêche, sauge, ocre) pour les membres
du foyer et les échéances. Tout est dans le bloc `@theme` de
`frontend/src/index.css`, et nulle part ailleurs : aucun composant ne contient
de couleur en dur. La correspondance avec la palette de référence est écrite en
tête de ce bloc.

Les échelles portent des noms de rôle (`brand`, `sand`) et non de teinte :
changer de couleur, c'est changer des valeurs, pas renommer des classes.

Pour retoucher une teinte, deux contraintes à garder en tête, rappelées en
commentaire à côté de chaque valeur :

- **4,5:1 pour tout texte**, y compris les textes d'attente des champs
  (`sand-400`) et le texte des boutons sur `brand-600` — c'est pourquoi le
  vieux rose 500, sur lequel le blanc ne tient que 2,8:1, n'habille pas les
  boutons ;
- **3:1 pour ce qu'on manipule** : contour des champs et cases à cocher
  (`sand-300`), anneau de focus (`brand-600`).

Changer la couleur de marque demande aussi de mettre à jour la barre système
(`theme-color` dans `frontend/index.html`, `theme_color` du manifeste dans
`frontend/vite.config.js`) et de régénérer les icônes (voir plus bas).

Les ombres passent par les variables `--ombre-*` de la couche de base : Tailwind
recopie la valeur des ombres dans chaque utilitaire, et seule une variable
permet au mode sombre de les remplacer.

Polices : DM Sans pour le texte, Fraunces pour les titres (`font-titre`), toutes
deux servies par l'application (paquets `@fontsource-variable`) — la CSP
interdit Google Fonts, et la PWA les garde hors ligne. Ces fichiers n'ont pas de
chiffres à chasse fixe : `tabular-nums` est sans effet.

---

## Mode sombre

L'interface suit le réglage du téléphone, sans bouton pour en changer.

Aucun composant ne connaît le mode : seules les valeurs des variables de couleur
changent, dans `src/index.css`. L'échelle des neutres s'inverse — `text-sand-900`
reste « le texte le plus lisible », `bg-sand-200` reste « à peine détaché du
fond ». Les surfaces, elles, ne s'inversent pas : elles s'éclaircissent avec
l'élévation, comme le veut l'usage en sombre — une carte posée sur la page est
plus claire qu'elle, un panneau glissé plus clair encore.

Là où une échelle ne suffit pas, un **jeton de rôle** tranche : `bg-surface`,
`bg-fond`, `bg-entete`, `text-accent`, `text-danger`, `bg-voile`,
`text-sur-marque`. Ils existent parce qu'une clarté n'est pas une fonction — une
même teinte servait à la fois de fond de bouton et de couleur de lien, et en
sombre l'un doit rester foncé quand l'autre doit s'éclaircir. `text-sur-marque`
est le texte posé sur `bg-brand-600` : blanc en clair, prune en sombre, où le
bouton prend un vieux rose éclairci.

**Un module n'a rien à faire pour en profiter**, à condition d'employer ces
jetons plutôt que `bg-white` ou une couleur en dur.

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

Les variables `MCP_*` du connecteur Claude sont décrites avec lui, dans
[Mettre le connecteur en service](#mettre-le-connecteur-en-service) ;
`MINKA_LANG` et `MINKA_CURRENCY` dans [Langue](#langue).

Le modèle a un jumeau anglais, [`.env.example.en`](.env.example.en), débarrassé
de ce qui est propre à ce serveur : mêmes variables, dans le même ordre. Une
variable ajoutée à l'un s'ajoute à l'autre — et au guide anglais,
[`README.en.md`](README.en.md), quand elle touche au déploiement.

### ⚠️ `SESSION_COOKIE_SECURE` et l'accès direct par IP

Avec `SESSION_COOKIE_SECURE=true`, **la connexion ne fonctionne pas via
`http://IP_UNRAID:8070`** : le navigateur refuse d'enregistrer un cookie
`Secure` reçu en clair. La connexion semble réussir — le tableau de bord
s'affiche —, mais le premier module ouvert, comme le moindre rechargement,
ramène à l'écran de connexion.

Ce n'est pas un bug. L'accès nominal est le sous-domaine HTTPS servi par NPM —
et le service worker de la PWA exige HTTPS de toute façon. Pour un test
ponctuel en direct sur le LAN, passer temporairement la variable à `false` et
relancer `docker compose up -d`. `TRUST_PROXY` reste à `2` : `1` ne vaut que
sans reverse proxy du tout, NPM retiré ([`TRUST_PROXY`](#trust_proxy)).

### `TRUST_PROXY`

Sert à retrouver l'adresse réelle du visiteur derrière les proxies. Mal réglée,
la limitation du nombre de tentatives de connexion s'applique à l'adresse du
proxy, donc à tout le monde en même temps : une série d'échecs vous bloquerait
tous les deux d'un coup.

- `2` — derrière Nginx Proxy Manager (valeur par défaut)
- `1` — en accès direct sur le port 8070, sans reverse proxy

---

## Langue

Minka parle **une langue par instance** : `fr` (par défaut) ou `en`, fixée par
`MINKA_LANG` dans `.env`. Tout suit ce réglage — l'interface, les messages de
l'API, ses journaux, le connecteur Claude. La monnaie du budget se règle à
côté, par `MINKA_CURRENCY` (code ISO 4217, `EUR` par défaut). L'anglais de
Minka est britannique : le jour avant le mois, « Monday 5 October ».

Une instance anglaise se déploie avec [`README.en.md`](README.en.md), guide en
anglais qui ne suppose ni unRAID ni Nginx Proxy Manager, et le modèle
[`.env.example.en`](.env.example.en).

L'interface est **compilée** dans la langue de l'instance : le manifeste de la
PWA et `<html lang>` en dépendent, et ne sauraient attendre une réponse du
serveur — une langue lue au démarrage ferait clignoter l'écran, et dépendrait du
réseau que l'application doit savoir perdre. `docker-compose.yml` passe donc
les deux variables en argument de build à `minka-web`, et `MINKA_LANG` en
environnement à `minka-api`, depuis le même `.env` : l'interface et l'API ne
peuvent pas se contredire. Changer de langue demande de reconstruire :

```bash
docker compose up -d --build
```

Ce qui ne change pas avec la langue : les données déjà saisies, les adresses de
l'application (`/courses`, `/recettes`…) et le code lui-même — identifiants,
champs JSON et commentaires restent en français. Ce que Minka sème au premier
démarrage, comme le plan d'entretien par défaut, naît dans la langue de
l'instance et n'en change plus.

Une valeur inconnue arrête tout, l'API au démarrage comme l'interface à la
compilation, plutôt que de retomber en silence sur le français.

En développement, la variable se donne au lancement, des deux côtés
(`backend/.env` peut aussi la porter) :

```bash
cd backend && MINKA_LANG=en npm run dev
```

```bash
cd frontend && MINKA_LANG=en npm run dev
```

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
Côté API : `lib/recurrence.js`, l'arithmétique des rythmes récurrents —
hebdomadaire à annuel, trimestriel et semestriel compris — avec sa protection
contre la dérive du 31. Elle appartient au socle parce que deux modules s'en
servent : les tâches, qui replanifient depuis l'échéance, et l'entretien, qui
repart du jour du geste. Également `modules/shopping/rayons.js`, le classement
d'un nom d'article en rayon : la normalisation qui réunit « Œufs », « oeufs » et
« 2 œufs », les pièges du français que le dictionnaire doit tenir — le lait de
coco n'est pas de la crémerie, l'eau de Javel n'est pas une boisson —, ceux de
l'anglais pour l'instance anglaise — le « peanut butter » n'est pas du beurre,
les « hot dogs » ne vont pas à l'animalerie —, et l'invariant qui vérifie que
chaque terme de chaque dictionnaire se range là où il est déclaré. Puis `modules/menus/reorganisation.js`, la règle « insérer et
pousser » qui réorganise le planning : la poussée jusqu'à la première case
libre, la chaîne qui tourne quand un repas y remonte, le débordement sur la
semaine suivante. Et `modules/recipes/resolution.js` avec `lib/titres.js`, la
règle « la recette du foyer fait foi » et la comparaison des titres à
l'orthographe près — que deux plats différents, « Tarte aux pommes » et « Tarte
aux pommes de terre », ne se confondent pas.

Enfin le connecteur Claude : sa configuration (`modules/mcp/config.js`), qui
refuse une installation à moitié faite ; la vérification des jetons
(`jeton.js`), éprouvée contre un faux Pocket-ID — des clés générées pour
l'occasion, sans réseau — qui signe des jetons pour une autre application, par
un autre émetteur, expirés ou sans la permission ; et la traduction entre les
mots de Claude et les routes de Minka (`traduction.js`), dont la détection des
cases occupées.

Côté interface : `lib/dates.js`, `lib/collection.js` — les opérations de liste
et le suivi des quantités sur lesquels repose `useCollection` — et la logique
pure de chaque module : échéances du frigo, agenda du calendrier, échéances des
tâches, regroupement de la liste de courses par rayon, réorganisation du
planning des menus — la copie de la règle du serveur, vérifiée par les mêmes
scénarios que l'original —, son défilement au bord de l'écran et ses
raccourcis.

Les fichiers testés sont volontairement séparés de tout accès à la base ou au
DOM. C'est ce qui permet à `node --test` de les charger tels quels : un test qui
importerait `service.js` ouvrirait une connexion SQLite, et donc créerait un
fichier de base, pour vérifier une addition de dates.

Un test vit à côté du code qu'il vérifie, dans le dossier de son module — un
module reste ainsi entier dans son dossier, tests compris.

Les deux langues se vérifient dans le même `npm test` : une fonction qui produit
ou lit du texte prend la langue en paramètre, et ses tests anglais la donnent
explicitement. Hors de Vite, l'interface est en français quelle que soit la
variable du poste ; l'API, elle, lit `MINKA_LANG` dans l'environnement — les
tests s'y lancent donc sans elle.

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
import { T } from './textes.js';

export default {
  id: 'budget',
  label: T.module.label,
  description: T.module.description,
  path: '/budget',
  Component: BudgetPage,
  Icon: BudgetIcon,                 // facultatif
  shortLabel: T.module.shortLabel,  // facultatif — libellé de l'onglet, si `label` est long
  tabOrder: 3,                      // facultatif — rang d'affichage, tuile comme onglet
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

### Les textes d'un module

Un module ne laisse aucune phrase en dur dans ses composants : il les range dans
son propre `textes.js`, une entrée par langue, avec les mêmes clés.

```js
// frontend/src/modules/budget/textes.js
import { textes } from '../../lib/langue.js';

export const TEXTES = {
  fr: {
    module: { label: 'Budget', description: 'Où part l’argent du mois' },
    depenses: (n) => `${n} dépense${n > 1 ? 's' : ''}`,
  },
  en: {
    module: { label: 'Budget', description: 'Where the money goes this month' },
    depenses: (n) => `${n} expense${n > 1 ? 's' : ''}`,
  },
};

export const T = textes(TEXTES);
```

Une entrée est une chaîne, ou une fonction dès qu'il faut accorder ou
interpoler : pluriels, élisions et ordre des mots restent l'affaire de chaque
langue, sans syntaxe de gabarit à apprendre. Côté API, même fichier, même forme,
dans `backend/src/modules/<nom>/` : messages d'erreur, messages des schémas
zod, journaux. Le socle tient les siens dans `src/textes.js`, de chaque côté ;
côté interface, `commun` y rassemble ce que tous les modules partagent
(« Fermer », « Enregistrer »).

Un test du socle, `lib/langue.test.js` de chaque côté, trouve tous les
`textes.js` et vérifie que chaque langue porte exactement les mêmes clés, avec
des fonctions au même nombre de paramètres : une traduction oubliée échoue au
test, pas à l'écran. Rien à déclarer pour qu'un nouveau module y passe.

Une fonction pure qui produit ou lit du texte — un libellé d'échéance, un
analyseur d'import — prend la langue en dernier paramètre, celle de l'instance
par défaut, et choisit son dictionnaire par `textes(TEXTES, langue)`. Les
formats de date passent par `formateurDate(options, langue)` (`lib/langue.js`),
qui choisit la locale et garde les formateurs en cache.

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
d'heure qui vérifient l'existence réelle du jour, pas seulement le format ; et
`cleTitre` / `memePlat` (`src/lib/titres.js`), qui disent si deux titres
désignent le même plat — sans casse, accents, ponctuation ni pluriel.

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

**Quand la dépendance porte sur des données**, et plus seulement sur un bouton,
le même contrat tient — mais il faut y mettre trois choses de plus. Menus et
recettes en sont le cas d'école, eux qui ne formaient qu'un module :

- **une copie de ce qu'on affiche.** Une case du planning porte l'intitulé
  recopié le jour de la pose. C'est ce qui lui permet de s'afficher sans
  interroger l'autre module — et donc de rester lisible quand il ne répond pas ;
- **un pointeur sans clé étrangère.** `meal_plan.recipe_id` n'est garanti par
  rien : SQLite ne peut pas veiller sur une table qui appartient à un autre
  module, et un identifiant devenu caduc doit être un cas normal, pas une
  erreur. Ici, il fait retomber la case sur sa copie ;
- **une route taillée pour l'appelant.** `/api/recipes/ingredients?ids=` et
  `/api/recipes/resolve` n'existent que pour lui, et lui livrent du prêt à
  l'emploi — un libellé de course tout fait, des identifiants résolus. Sans
  elles, il faudrait vingt allers-retours et une part de la logique de l'un
  réécrite chez l'autre.

Le prix à payer est réel, et il vaut d'être dit : ce qui était une jointure SQL
devient deux requêtes et une couture par position, et ce qu'une transaction
garantissait d'un bloc se garantit désormais par l'ordre des appels — le module
qui écrit en premier étant celui dont l'échec ne laisse rien à moitié fait.

**Quand le lien mène à une page**, et non plus à une route d'API, le contrat
tient encore : on n'importe pas les composants de l'autre module, on se rend à
son adresse. La casserole d'un repas mène ainsi à la fiche d'une recette, par
une adresse construite en un seul endroit du module menus, à côté de ses appels
HTTP :

```jsx
// menus/api.js
export const adresseRecette = (id) => `/recettes?recette=${id}`;

// …puis un simple lien, sans import du module recettes :
<Link to={adresseRecette(recette.id)}>…</Link>
```

C'est le module qui reçoit qui documente son adresse, et qui la consomme à
l'arrivée : il retire le paramètre une fois lu, et ramène d'où l'on vient quand
on referme. L'appelant, lui, ne pose le lien que si le module répond
(`useServerModule`) et que ce qu'il désigne existe encore — un pointeur caduc
ne mènerait nulle part. Un paramètre plutôt qu'une sous-route : le socle déclare
exactes les routes des modules, et `/recettes/12` retomberait sur l'accueil.

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
- [x] **Hors ligne en lecture** : l'application s'ouvre et affiche les dernières
      données connues sans réseau.
- [x] **Mode sombre**, suivant le réglage du téléphone.
- [x] **Module Notes** : sauvegarde automatique, épinglage, et détection de
      l'édition simultanée.
- [x] **Module Budget** : dépenses du mois, catégories à plafond, saisie en
      trois secondes.
- [x] **Module Entretien** : planning de la maison par pièce, replanifié depuis
      le jour du geste, et moteur de récurrence remonté au socle.
- [x] **Import d'une semaine de menus** écrite en texte, avec aperçu avant
      application et création des recettes au passage.
- [x] **Rayons de la liste de courses** : classement automatique à l'ajout
      d'après un dictionnaire livré avec le code, et correction par appui long
      qui s'apprend pour les fois suivantes.
- [x] **Module Recettes** : le répertoire extrait du module menus, avec sa
      fiche en lecture ; le planning n'en garde qu'un pointeur souple et
      l'intitulé recopié, et les deux modules ne dialoguent plus que par HTTP.
- [x] **Mode cuisine** : les étapes cochées à mesure, en pleine page, l'écran
      maintenu allumé, la progression gardée dans le navigateur.
- [x] **Chercher dans les recettes** : par titre et par ingrédient, filtre par
      étiquettes libres dont les orthographes se rejoignent, et import d'une
      recette collée en texte avec aperçu avant création.
- [x] **Des menus à la recette** : une casserole au bout d'un repas ouvre sa
      fiche d'un tap, la refermer ramène au planning, et celui-ci s'ouvre
      centré sur aujourd'hui.
- [x] **Réorganiser la semaine** : glisser un repas par sa poignée, le poser
      par « Déplacer… » jusque dans une autre semaine, le décaler d'un jour —
      une seule règle, « insérer et pousser », appliquée par le serveur et
      prédite par la page —, annuler pendant huit secondes, et les textes
      libres du foyer posés d'un tap.
- [x] **La recette du foyer fait foi** : une recette qui a sa préparation n'est
      plus réécrite par un import, une ébauche est complétée sans perdre ce que
      le foyer y avait mis, et les titres se retrouvent à l'orthographe près.
- [x] **Connecteur Claude** : Claude lit le planning, le répertoire et le frigo,
      et pose la semaine préparée ensemble, recettes entières comprises — sans
      copier-coller. L'accès est délivré par Pocket-ID, et le connecteur ne
      parle aux autres modules que par leurs routes HTTP.
- [x] **Instance anglaise** : une langue par instance (`MINKA_LANG`), que
      suivent l'interface, l'API, ses journaux et le connecteur Claude ;
      rangement par rayon, import de recette et import de semaine en anglais ;
      monnaie du budget au choix ; guide de déploiement anglais
      ([README.en.md](README.en.md)).

Pistes pour la suite : chaque nouveau module suit le mode d'emploi ci-dessus.
Côté hors ligne, l'étape suivante serait la **file d'écriture** :
empiler les modifications faites sans réseau et les rejouer au retour. Elle n'a
pas été faite parce que sa difficulté n'est pas la file, mais le conflit quand
vous modifiez tous les deux la même chose chacun de votre côté. Côté liste de
courses, les rayons étant faits, les évolutions naturelles seraient les articles
récurrents et le temps réel (SSE) à la place du rafraîchissement au retour sur
l'application. Côté connecteur Claude, l'étape suivante serait d'envoyer
lui-même les ingrédients de la semaine dans la liste de courses — elle passe
aujourd'hui par le bouton des menus, qui laisse décocher ce qu'on a déjà —, puis
d'ouvrir d'autres modules : le calendrier, pour que Claude sache quels soirs on
ne dîne pas à la maison. Côté
menus, la semaine affichée gagnerait à vivre dans l'adresse : revenir d'une
recette posée une autre semaine ramène pour l'instant sur la semaine en cours.
Côté calendrier, les événements récurrents et un
flux ICS en lecture seule, pour s'abonner depuis l'application native du
téléphone. Une notification à l'approche d'une date de péremption ou d'un
rendez-vous supposerait d'ajouter le push web (VAPID), non configuré à ce jour.

## Licence

Minka est distribué sous la **GNU Affero General Public License, version 3**
(AGPL-3.0-only), dont le texte complet est dans [LICENSE](LICENSE).
Copyright (C) 2026 arvostettu.

Chacun peut installer Minka, l'étudier, le modifier et le redistribuer. La
contrepartie vise les versions modifiées : qui en redistribue une doit en
fournir le code sous la même licence, et qui en fait tourner une en ligne pour
d'autres doit offrir ce code à ses utilisateurs. Un dérivé de Minka ne peut
donc pas devenir un service fermé. Le code est fourni sans aucune garantie.
