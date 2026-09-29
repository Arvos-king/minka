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
  menus arrivent donc rangés eux aussi, sans rien savoir des rayons ;
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

**Importer une semaine**, enfin : le bouton « Importer » de l'en-tête accepte un
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

Le sort de chaque plat suit une seule règle :

- **des ingrédients listés → une recette**, créée ou mise à jour. C'est ce qui
  alimente ensuite la liste de courses ;
- **pas d'ingrédients, mais une recette du même nom existe → elle est
  réutilisée**, ce qui permet d'écrire « Gratin de courgettes » sans recopier sa
  liste chaque semaine ;
- **pas d'ingrédients, aucune recette connue → un texte libre**, comme
  « restes » ou « chez mes parents ».

L'import se fait en **deux requêtes, deux transactions**. Les plats partent
d'abord au module recettes, qui les retrouve ou les crée et rend leurs
identifiants ; le planning se pose ensuite, d'un bloc. L'ordre compte : si la
première échoue, le planning n'a pas encore bougé, et l'on sait exactement où
l'on en est. Sept allers-retours pour sept jours, eux, laisseraient un planning
à moitié rempli si la connexion lâchait au milieu.

Sans le module recettes, la semaine entière se pose en texte libre : les
ingrédients lus sont perdus, mais le menu est là — et le panneau le dit avant
d'appliquer.

Le pré-prompt du projet Claude qui rédige ces semaines vit dans
[`docs/prompt-menus.md`](docs/prompt-menus.md) : il décrit ce format à la
lettre, et c'est là qu'il faut répercuter toute évolution de l'analyseur.

| Route | Effet |
| --- | --- |
| `GET /api/menus/plan?from=&to=` | Repas prévus sur la période |
| `PUT /api/menus/plan/:date/:slot` | Pose un repas (`title`, plus `recipeId` facultatif) |
| `DELETE /api/menus/plan/:date/:slot` | Vide la case |
| `POST /api/menus/import` | Pose une semaine entière, en une transaction |

`PUT` et non `POST` sur une case : c'est une ressource adressable dont on fixe
le contenu, et poser deux fois le même repas au même endroit doit donner le même
résultat.

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

| Route | Effet |
| --- | --- |
| `GET /api/recipes/items` | Le répertoire, avec le **nom** des ingrédients et les étiquettes |
| `GET /api/recipes/items/:id` | Une recette entière |
| `POST /api/recipes/items` | Création |
| `PATCH /api/recipes/items/:id` | Modification — `ingredients`, `steps` et `tags` remplacent la liste entière |
| `DELETE /api/recipes/items/:id` | Suppression |
| `GET /api/recipes/ingredients?ids=1,2,5` | Ingrédients de plusieurs recettes, regroupés par nom |
| `POST /api/recipes/resolve` | Des intitulés → des identifiants, en créant ce qui manque |

Le répertoire porte le **nom** des ingrédients — pas leurs quantités, pas les
étapes. C'est ce qu'il faut pour choisir, et surtout pour chercher : le tri et
le filtre se font ensuite dans le navigateur, sans aller-retour à chaque lettre
tapée, et hors ligne comme en ligne.

Les deux dernières routes existent **pour les autres modules**. `/ingredients` livre le
libellé tout fait — « Crème (20 cl + un filet) » — de sorte que celui qui
l'envoie dans les courses n'a qu'une chaîne à recopier, sans rien savoir de la
forme d'un ingrédient. `/resolve` reçoit des plats lus dans un texte et rend de
quoi les désigner : c'est par là que passe l'import d'une semaine de menus, sans
que le planning écrive jamais dans les tables des recettes. Les plats en
reviennent **dans l'ordre où ils sont partis**, ce qui permet de les recoudre par
position.

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

## Mode sombre

L'interface suit le réglage du téléphone, sans bouton pour en changer.

Aucun composant ne connaît le mode : seules les valeurs des variables de couleur
changent, dans `src/index.css`. L'échelle des neutres s'inverse — `text-sand-900`
reste « le texte le plus lisible », `bg-sand-200` reste « à peine détaché du
fond ». Les surfaces, elles, ne s'inversent pas : elles s'éclaircissent avec
l'élévation, comme le veut l'usage en sombre — une carte posée sur la page est
plus claire qu'elle, un panneau glissé plus clair encore.

Là où une échelle ne suffit pas, un **jeton de rôle** tranche : `bg-surface`,
`bg-fond`, `bg-entete`, `text-accent`, `text-danger`, `bg-voile`. Ils existent
parce qu'une clarté n'est pas une fonction — `brand-700` servait à la fois de
fond de bouton et de couleur de lien, et en sombre l'un doit rester foncé quand
l'autre doit s'éclaircir.

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
Côté API : `lib/recurrence.js`, l'arithmétique des rythmes récurrents —
hebdomadaire à annuel, trimestriel et semestriel compris — avec sa protection
contre la dérive du 31. Elle appartient au socle parce que deux modules s'en
servent : les tâches, qui replanifient depuis l'échéance, et l'entretien, qui
repart du jour du geste. Également `modules/shopping/rayons.js`, le classement
d'un nom d'article en rayon : la normalisation qui réunit « Œufs », « oeufs » et
« 2 œufs », les pièges du français que le dictionnaire doit tenir — le lait de
coco n'est pas de la crémerie, l'eau de Javel n'est pas une boisson — et
l'invariant qui vérifie que chacun de ses quatre cents termes se range là où il
est déclaré.

Côté interface : `lib/dates.js`, `lib/collection.js` — les opérations de liste
et le suivi des quantités sur lesquels repose `useCollection` — et la logique
pure de chaque module : échéances du frigo, agenda du calendrier, échéances des
tâches, regroupement de la liste de courses par rayon.

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

Pistes pour la suite : chaque nouveau module suit le mode d'emploi ci-dessus.
Côté hors ligne, l'étape suivante serait la **file d'écriture** :
empiler les modifications faites sans réseau et les rejouer au retour. Elle n'a
pas été faite parce que sa difficulté n'est pas la file, mais le conflit quand
vous modifiez tous les deux la même chose chacun de votre côté. Côté liste de
courses, les rayons étant faits, les évolutions naturelles seraient les articles
récurrents et le temps réel (SSE) à la place du rafraîchissement au retour sur
l'application. Côté recettes, l'import d'une semaine de menus ne sait pas encore
porter les étapes ni les étiquettes — une recette qu'il crée naît avec ses seuls
ingrédients, et sa préparation s'écrit après coup ; l'analyseur d'une recette
collée sait pourtant déjà les lire, et
[`docs/prompt-menus.md`](docs/prompt-menus.md) devrait alors le dire. Côté
menus, la semaine affichée gagnerait à vivre dans l'adresse : revenir d'une
recette posée une autre semaine ramène pour l'instant sur la semaine en cours.
Côté calendrier, les événements récurrents et un
flux ICS en lecture seule, pour s'abonner depuis l'application native du
téléphone. Une notification à l'approche d'une date de péremption ou d'un
rendez-vous supposerait d'ajouter le push web (VAPID), non configuré à ce jour.
