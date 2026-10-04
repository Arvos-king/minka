/**
 * Où ranger un article de courses.
 *
 * Le regroupement par rayon tient en trois lignes ; ce qui coûte, c'est le
 * premier jour. Une liste où il faudrait étiqueter chaque article à la main ne
 * servirait jamais deux fois. Ce fichier est donc livré avec un dictionnaire
 * d'environ quatre cents produits courants par langue, qui suffit à ranger la
 * plupart des ajouts sans rien demander à personne. Ses trous se rebouchent à
 * l'usage, une fois par produit : corriger un rangement l'apprend (voir
 * `service.js`).
 *
 * Le moteur est ici ; ce qui tient à la langue — mots à ignorer, singulier,
 * sens de lecture, dictionnaire — vit dans `rayons.fr.js` et `rayons.en.js`.
 * Les rayons, eux, sont les mêmes partout : seuls leurs libellés se traduisent.
 *
 * Tout est pur ici — ni base, ni DOM — pour rester vérifiable par
 * `node --test`, comme `entretien/planning.js`.
 */

import { LANGUE, textes } from '../../lib/langue.js';
import { REGLES as REGLES_EN } from './rayons.en.js';
import { REGLES as REGLES_FR } from './rayons.fr.js';
import { TEXTES } from './textes.js';

/**
 * Les rayons, dans l'ordre du parcours en magasin. « Autres » ferme la marche,
 * et c'est aussi le repli : un article que le dictionnaire ne connaît pas
 * tombe en fin de liste plutôt que dans un rayon au hasard.
 *
 * Ils sont figés dans le code, et c'est un parti pris : une table les rendrait
 * modifiables, donc renommables et réordonnables, donc à administrer — beaucoup
 * d'écrans pour une liste qui ne bouge pas d'une année sur l'autre et qui doit
 * surtout rester la même pour tout le monde.
 */
export const CLES_RAYONS = [
  'fruits-legumes',
  'boulangerie',
  'boucherie',
  'poissonnerie',
  'charcuterie-traiteur',
  'cremerie',
  'epicerie-salee',
  'epicerie-sucree',
  'boissons',
  'surgeles',
  'hygiene',
  'entretien',
  'autres',
];

export const RAYON_PAR_DEFAUT = 'autres';

/** Les rayons et leurs libellés, dans la langue demandée. */
export function rayons(langue = LANGUE) {
  const libelles = textes(TEXTES, langue).rayons;
  return CLES_RAYONS.map((cle) => ({ cle, libelle: libelles[cle] }));
}

/** Ceux de l'instance : ils voyagent avec les articles (voir `routes.js`). */
export const RAYONS = rayons();

/** « 500 », « x2 », « 2x » — jamais un produit. */
const NOMBRES = /^x?\d+x?$/;

/**
 * Minuscules, sans accents, sans ponctuation.
 *
 * NFD décompose « é » en « e » suivi d'un accent détaché, que `\p{Mn}` retire
 * — cela vaut aussi pour « ç ». Les ligatures « œ » et « æ », elles, ne se
 * décomposent pas : elles sont traduites à part, et avant le passage à
 * l'alphabet nu, sans quoi « œufs » perdrait sa première syllabe.
 */
export function normaliser(nom) {
  return String(nom ?? '')
    .normalize('NFD')
    // Mn = « marque non espaçante », la catégorie Unicode des accents détachés.
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    // Une parenthèse ne contient jamais le nom du produit : les menus envoient
    // « Ail (2 gousses + un peu) », où seul « Ail » identifie l'article. Elle
    // part en entier, sinon la clé apprise sur cet ajout-là ne servirait à
    // aucun autre.
    .replace(/\([^)]*\)/g, ' ')
    // Tout ce qui n'est ni lettre ni chiffre devient une séparation : les
    // apostrophes (« d'olive »), les traits d'union (« chou-fleur ») et le
    // « × » de « Lait ×2 ».
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Le moteur d'une langue : sa clé de nom, et son classement.
 *
 * Les deux index du dictionnaire sont bâtis au chargement, et toute
 * incohérence arrête le démarrage plutôt que de s'écraser en silence — même
 * parti pris que `verifierCollisions` dans le chargeur de modules. Un terme
 * écrit dans deux rayons est une faute de saisie, jamais une nuance : le
 * second gagnerait sans qu'on le sache.
 */
function construireMoteur(regles, langue) {
  const liaisons = new Set(regles.liaisons);
  const unites = new Set(regles.unites);
  const conditionnements = new Set(regles.conditionnements);
  const prioritaires = new Map(Object.entries(regles.prioritaires));

  /**
   * La forme stable d'un nom d'article : celle que compare le dictionnaire, et
   * celle sous laquelle une correction est mémorisée.
   *
   *   « 500 g de farine »        → « farine »
   *   « Lait ×2 »                → « lait »
   *   « Courgettes (200 g + 2) » → « courgette »   ← le format des menus
   *   « Filet de poulet »        → « filet de poulet »
   *
   * Les liaisons de tête et de queue tombent — sans quoi « 500 g de farine »
   * donnerait « de farine », qui n'aurait plus rien à voir avec « Farine ».
   * Celles du milieu restent : elles portent le sens.
   */
  function cleDeNom(nom) {
    const mots = normaliser(nom)
      .split(' ')
      .filter((mot) => mot !== '' && !NOMBRES.test(mot))
      .map(regles.singulariser)
      .filter((mot) => !unites.has(mot));

    while (mots.length > 0 && liaisons.has(mots[0])) mots.shift();
    while (mots.length > 0 && liaisons.has(mots.at(-1))) mots.pop();

    return mots.join(' ');
  }

  const expressions = []; // [{ forme, poids, rayon }]
  const mots = new Map(); // mot → rayon

  for (const [rayon, termes] of Object.entries(regles.dictionnaire)) {
    if (!CLES_RAYONS.includes(rayon)) throw new Error(`Rayon inconnu (${langue}) : ${rayon}.`);

    for (const terme of termes) {
      const forme = cleDeNom(terme);
      if (forme === '') throw new Error(`Terme sans mot dans « ${rayon} » (${langue}) : ${terme}.`);

      const decoupe = forme.split(' ');
      if (decoupe.length > 1) {
        expressions.push({ forme, poids: decoupe.length, rayon });
        continue;
      }

      // La garde attrape aussi « pomme » et « pommes » écrits dans deux rayons :
      // les deux se réduisent à la même forme indexée.
      const occupe = mots.get(forme);
      if (occupe) {
        throw new Error(`« ${terme} » est déclaré dans « ${occupe} » et « ${rayon} » (${langue}).`);
      }
      mots.set(forme, rayon);
    }
  }

  // Un mot prioritaire décide seul : il ne peut pas aussi appartenir à un
  // rayon du dictionnaire, qu'il contredirait.
  for (const [mot, rayon] of prioritaires) {
    if (!CLES_RAYONS.includes(rayon)) throw new Error(`Rayon inconnu (${langue}) : ${rayon}.`);
    if (mots.has(mot)) throw new Error(`« ${mot} » est à la fois prioritaire et au dictionnaire (${langue}).`);
  }

  // La plus longue expression est essayée d'abord, pour qu'une exception plus
  // précise l'emporte sur une exception plus large.
  expressions.sort((a, b) => b.poids - a.poids || b.forme.length - a.forme.length);

  /**
   * Le rayon d'un article, d'après le seul dictionnaire.
   *
   * Trois passes, dans cet ordre :
   *   1. les mots prioritaires, qui décident seuls (« frozen peas ») ;
   *   2. les expressions, qui sont les exceptions de la langue — « lait de
   *      coco » n'est pas de la crémerie, « eau de javel » n'est pas une
   *      boisson ;
   *   3. les mots isolés, dans le sens de lecture de la langue : le premier
   *      reconnu gagne. Le sens dit où se trouve le nom principal — en tête
   *      en français, en queue en anglais.
   */
  function classer(nom) {
    const cle = cleDeNom(nom);
    if (cle === '') return RAYON_PAR_DEFAUT;

    const decoupe = cle.split(' ');
    for (const mot of decoupe) {
      const rayon = prioritaires.get(mot);
      if (rayon) return rayon;
    }

    const entoure = ` ${cle} `;
    for (const { forme, rayon } of expressions) {
      if (entoure.includes(` ${forme} `)) return rayon;
    }

    const ordre = regles.sens === 'droite' ? decoupe.reverse() : decoupe;
    for (const mot of ordre) {
      if (liaisons.has(mot) || conditionnements.has(mot)) continue;
      const rayon = mots.get(mot);
      if (rayon) return rayon;
    }

    return RAYON_PAR_DEFAUT;
  }

  return { cleDeNom, classer, dictionnaire: regles.dictionnaire };
}

const MOTEURS = {
  fr: construireMoteur(REGLES_FR, 'fr'),
  en: construireMoteur(REGLES_EN, 'en'),
};

const moteur = (langue) => MOTEURS[langue] ?? MOTEURS.fr;

/**
 * La clé d'un nom d'article, dans la langue de l'instance par défaut.
 *
 * C'est sous cette clé que le foyer retient ses corrections : elle ne doit
 * donc pas changer de règles en cours de route. Une instance qui changerait de
 * langue réapprendrait simplement ses rangements.
 */
export function cleDeNom(nom, langue = LANGUE) {
  return moteur(langue).cleDeNom(nom);
}

export function classer(nom, langue = LANGUE) {
  return moteur(langue).classer(nom);
}

/** Le dictionnaire d'une langue, un bloc par rayon — pour les tests. */
export function dictionnaire(langue = LANGUE) {
  return moteur(langue).dictionnaire;
}

export const DICTIONNAIRE = dictionnaire();

/**
 * La règle de priorité : la correction du foyer d'abord, le dictionnaire
 * ensuite.
 *
 * Elle est isolée ici, et non dans le service, pour rester vérifiable sans
 * ouvrir de base : il ne reste là-bas que la lecture de la ligne apprise.
 *
 * Un rayon appris qui n'existe plus dans le code est ignoré — c'est ce qui
 * permet d'en retirer un sans avoir à migrer quoi que ce soit.
 */
export function choisirRayon(nom, rayonAppris, langue = LANGUE) {
  if (rayonAppris && CLES_RAYONS.includes(rayonAppris)) return rayonAppris;
  return classer(nom, langue);
}
