/**
 * Où ranger un article de courses.
 *
 * Le regroupement par rayon tient en trois lignes ; ce qui coûte, c'est le
 * premier jour. Une liste où il faudrait étiqueter chaque article à la main ne
 * servirait jamais deux fois. Ce fichier est donc livré avec un dictionnaire
 * d'environ quatre cents produits courants, qui suffit à ranger la plupart des
 * ajouts sans rien demander à personne. Ses trous se rebouchent à l'usage, une
 * fois par produit : corriger un rangement l'apprend (voir `service.js`).
 *
 * Tout est pur ici — ni base, ni DOM — pour rester vérifiable par
 * `node --test`, comme `entretien/planning.js`.
 */

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
export const RAYONS = [
  { cle: 'fruits-legumes', libelle: 'Fruits et légumes' },
  { cle: 'boulangerie', libelle: 'Boulangerie' },
  { cle: 'boucherie', libelle: 'Boucherie et volaille' },
  { cle: 'poissonnerie', libelle: 'Poissonnerie' },
  { cle: 'charcuterie-traiteur', libelle: 'Charcuterie et traiteur' },
  { cle: 'cremerie', libelle: 'Crémerie' },
  { cle: 'epicerie-salee', libelle: 'Épicerie salée' },
  { cle: 'epicerie-sucree', libelle: 'Épicerie sucrée' },
  { cle: 'boissons', libelle: 'Boissons' },
  { cle: 'surgeles', libelle: 'Surgelés' },
  { cle: 'hygiene', libelle: 'Hygiène et beauté' },
  { cle: 'entretien', libelle: 'Entretien et maison' },
  { cle: 'autres', libelle: 'Autres' },
];

export const RAYON_PAR_DEFAUT = 'autres';

export const CLES_RAYONS = RAYONS.map((rayon) => rayon.cle);

/**
 * Mots de liaison.
 *
 * Ils sont ignorés du balayage mot à mot, mais **gardés dans la phrase** :
 * c'est le « de » qui distingue « lait de coco » de « lait ». Les formes de
 * trois lettres ou moins figurent telles quelles, puisque `singulariser` les
 * laisse intactes — d'où « les » et « des » à côté de « le » et « de ».
 */
const LIAISONS = new Set([
  'de', 'du', 'des', 'd', 'le', 'la', 'les', 'l', 'un', 'une',
  'au', 'aux', 'et', 'en', 'a', 'pour', 'sans', 'avec',
]);

/** Unités de mesure : aucune n'est un produit, elles disparaissent du nom. */
const UNITES_MESURE = new Set([
  'g', 'kg', 'mg', 'l', 'cl', 'ml', 'dl', 'cs', 'cc', 'gramme', 'kilo', 'litre',
]);

/**
 * Conditionnements et découpes, ignorés du balayage mot à mot.
 *
 * « filet » y figure, et c'est le cas qui justifie l'ensemble : sans lui,
 * « filet de poulet » cesserait d'être du poulet. Aucun de ces mots ne doit
 * apparaître dans le dictionnaire — un test le vérifie.
 */
const CONDITIONNEMENTS = new Set([
  'pot', 'boite', 'paquet', 'pack', 'sachet', 'bouteille', 'brique', 'barquette',
  'botte', 'tranche', 'gousse', 'pincee', 'cuillere', 'bocal', 'rouleau', 'lot',
  'filet', 'bouquet', 'piece', 'unite', 'morceau', 'part',
]);

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
 * Singulier approximatif.
 *
 * La règle est fausse en français — « ananas » devient « anana » — et c'est
 * sans importance : les termes du dictionnaire passent par la même fonction,
 * donc les deux côtés se trompent de la même façon et se retrouvent. C'est ce
 * qui permet d'écrire le dictionnaire en français normal plutôt qu'en formes
 * canoniques illisibles.
 *
 * « eaux » est traité avant « aux », sans quoi il deviendrait « eal ».
 */
function singulariser(mot) {
  if (mot.length <= 3) return mot; // ail, riz, jus, thé, eau
  if (mot.endsWith('eaux')) return mot.slice(0, -1); // gâteaux, eaux
  if (mot.endsWith('aux')) return `${mot.slice(0, -3)}al`; // bocaux, journaux
  if (mot.endsWith('x') || mot.endsWith('s')) return mot.slice(0, -1);
  return mot;
}

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
export function cleDeNom(nom) {
  const mots = normaliser(nom)
    .split(' ')
    .filter((mot) => mot !== '' && !NOMBRES.test(mot))
    .map(singulariser)
    .filter((mot) => !UNITES_MESURE.has(mot));

  while (mots.length > 0 && LIAISONS.has(mots[0])) mots.shift();
  while (mots.length > 0 && LIAISONS.has(mots.at(-1))) mots.pop();

  return mots.join(' ');
}

/**
 * Le dictionnaire, un bloc par rayon.
 *
 * Il s'écrit en français normal, accentué et au pluriel si c'est ainsi qu'on
 * dit : `cleDeNom` passe sur ces termes comme sur les noms d'articles, donc les
 * deux formes se rejoignent. Un terme qui contient une espace est traité comme
 * une expression, et l'emporte sur les mots isolés.
 *
 * **Une expression ne s'écrit que si elle change la réponse.** « pomme de
 * terre » n'a pas d'entrée : « pomme » l'envoie déjà au bon rayon. C'est cette
 * règle qui garde les expressions à une trentaine d'entrées, toutes
 * justifiables une par une, plutôt qu'à un catalogue de rayon.
 */
export const DICTIONNAIRE = {
  // Le frais qui s'achète au poids. Les fruits secs (amandes, dattes) sont en
  // épicerie sucrée, où ils se trouvent réellement.
  'fruits-legumes': [
    'abricot', 'ail', 'ananas', 'aneth', 'artichaut', 'asperge', 'aubergine',
    'avocat', 'banane', 'basilic', 'betterave', 'blette', 'brocoli', 'carotte',
    'cassis', 'céleri', 'cerise', 'champignon', 'chou', 'ciboulette', 'citron',
    'citrouille', 'clémentine', 'concombre', 'coriandre', 'courge', 'courgette',
    'cresson', 'endive', 'estragon', 'fenouil', 'figue', 'fraise', 'framboise',
    'fruit', 'gingembre', 'grenade', 'groseille', 'haricot', 'kiwi', 'laitue',
    'laurier', 'litchi', 'légume', 'mandarine', 'mangue', 'mâche', 'melon',
    'menthe', 'mûre', 'myrtille', 'navet', 'nectarine', 'oignon', 'orange',
    'pamplemousse', 'panais', 'papaye', 'pastèque', 'patate', 'persil', 'pêche',
    'poire', 'poireau', 'poivron', 'pomme', 'potiron', 'prune', 'radis',
    'raisin', 'rhubarbe', 'romarin', 'roquette', 'salade', 'salsifis', 'thym',
    'tomate', 'topinambour', 'échalote', 'épinards',
    // « pois » seul ne peut pas être déclaré ici : il emmènerait les pois
    // chiches, qui sont en épicerie.
    'petits pois',
  ],

  // Ce qui se prend à la coupe, encore tiède. Le pain de mie et les biscottes
  // se gardent des semaines : ils sont en épicerie sucrée, pas ici.
  boulangerie: [
    'baguette', 'brioche', 'chocolatine', 'croissant', 'fougasse', 'pain',
    'viennoiserie',
  ],

  // « filet » étant un conditionnement, les découpes qui portent ce mot
  // s'écrivent en toutes lettres.
  boucherie: [
    'agneau', 'bavette', 'brochette', 'bœuf', 'canard', 'chipolata', 'cuisse',
    'côtelette', 'dinde', 'entrecôte', 'escalope', 'gigot', 'jarret', 'lapin',
    'magret', 'merguez', 'mouton', 'paleron', 'pintade', 'porc', 'poulet',
    'rosbif', 'rôti', 'saucisse', 'steak', 'tournedos', 'veau', 'viande',
    'volaille',
    'faux filet', 'filet mignon',
  ],

  poissonnerie: [
    'anchois', 'bar', 'bulot', 'cabillaud', 'calamar', 'colin', 'coquillage',
    'crabe', 'crevette', 'daurade', 'dorade', 'encornet', 'gambas', 'hareng',
    'homard', 'huître', 'langoustine', 'lotte', 'maquereau', 'merlan', 'morue',
    'moule', 'poisson', 'rouget', 'sardine', 'saumon', 'seiche', 'sole', 'thon',
    'truite', 'églefin',
    'saint-jacques',
  ],

  // Le foie gras et les terrines voisinent avec le jambon, au rayon frais.
  'charcuterie-traiteur': [
    'andouille', 'bacon', 'boudin', 'cervelas', 'charcuterie', 'chorizo',
    'coppa', 'foie', 'houmous', 'jambon', 'jambonneau', 'lardon', 'mortadelle',
    'pancetta', 'rillettes', 'rosette', 'salami', 'saucisson', 'surimi',
    'taboulé', 'tarama', 'terrine',
    // « pâté » et « pâtes » se réduisent tous deux à « pate ». Le pluriel des
    // pâtes étant bien plus fréquent sur une liste de courses, il garde le mot
    // isolé, et le pâté s'écrit ici en entier.
    'pâté de campagne', 'pâté en croûte', 'pâté de foie',
  ],

  // Le rayon réfrigéré. Les pâtes à dérouler y sont aussi, d'où leur présence
  // à côté des fromages.
  cremerie: [
    'beurre', 'brie', 'camembert', 'cantal', 'chantilly', 'chèvre', 'comté',
    'crème', 'emmental', 'feta', 'fromage', 'gruyère', 'lait', 'margarine',
    'mascarpone', 'morbier', 'mozzarella', 'parmesan', 'raclette', 'reblochon',
    'ricotta', 'roquefort', 'skyr', 'tomme', 'yaourt', 'œufs',
    'petit-suisse', 'pâte brisée', 'pâte feuilletée', 'pâte à pizza',
  ],

  // Le sec et les conserves. L'aluminium et le papier cuisson sont rangés ici
  // avec le film alimentaire, malgré le mot « papier » qui les tirerait vers
  // l'hygiène.
  'epicerie-salee': [
    'bouillon', 'boulgour', 'chips', 'conserve', 'cornichon', 'coulis',
    'couscous', 'cumin', 'curcuma', 'curry', 'câpres', 'gnocchis', 'harissa',
    'huile', 'ketchup', 'lasagnes', 'lentilles', 'maïs', 'mayonnaise',
    'moutarde', 'nouilles', 'olive', 'origan', 'paprika', 'pesto', 'poivre',
    'purée', 'pâtes', 'quinoa', 'raviolis', 'riz', 'safran', 'sauce', 'sel',
    'semoule', 'soupe', 'spaghettis', 'tabasco', 'tagliatelles', 'tapenade',
    'tortilla', 'vinaigre', 'vinaigrette', 'épices',
    'pois chiches', 'haricots rouges', 'lait de coco', 'herbes de Provence',
    'papier cuisson', 'papier aluminium', 'film alimentaire',
  ],

  // Le petit-déjeuner et la pâtisserie, café et thé compris : c'est leur
  // voisinage en magasin, alors que « boissons » ne tient que du liquide en
  // bouteille.
  'epicerie-sucree': [
    'amande', 'barre', 'biscotte', 'biscuit', 'bonbon', 'cacahuètes', 'cacao',
    'cannelle', 'cassonade', 'café', 'chocolat', 'compote', 'confiture',
    'crêpe', 'céréales', 'datte', 'farine', 'gaufre', 'granola', 'gâteau',
    'infusion', 'levure', 'madeleine', 'maïzena', 'miel', 'muesli', 'noisette',
    'noix', 'nutella', 'pistache', 'pruneau', 'sablé', 'sucre', 'thé', 'tisane',
    'vanille',
    'chewing-gum', 'pain de mie', 'pain grillé', 'pâte à tartiner',
    'beurre de cacahuète', 'crème de marron', 'sirop d’érable', 'lait d’amande',
    'lait de soja', 'lait de riz', 'lait d’avoine',
  ],

  boissons: [
    'apéritif', 'bière', 'champagne', 'cidre', 'coca', 'crémant', 'eau', 'jus',
    'kombucha', 'limonade', 'pastis', 'prosecco', 'rhum', 'sirop', 'soda',
    'tonic', 'vin', 'vodka', 'whisky',
  ],

  surgeles: [
    'esquimau', 'frites', 'glace', 'nuggets', 'pizza', 'poêlée', 'sorbet',
    'surgelé',
    'poisson pané', 'cordon bleu', 'crème glacée',
  ],

  // Le bébé est ici : couches et lingettes voisinent avec la parapharmacie,
  // qui apporte aussi les pansements et le paracétamol.
  hygiene: [
    'aspirine', 'brosse', 'coton', 'couche', 'dentifrice', 'douche',
    'démaquillant', 'déodorant', 'gel', 'gommage', 'lingette', 'maquillage',
    'mouchoir', 'pansement', 'papier', 'paracétamol', 'parfum', 'préservatif',
    'rasoir', 'savon', 'serviette', 'shampoing', 'shampooing', 'tampon',
    'vernis',
    'coupe-ongles', 'eau de toilette', 'eau micellaire', 'crème solaire',
    'crème à raser', 'fil dentaire',
  ],

  // L'animalerie est ici, pour la même raison : c'est là qu'on la croise.
  entretien: [
    'adoucissant', 'allumette', 'ampoule', 'anticalcaire', 'assouplissant',
    'balai', 'bougie', 'chiffon', 'cirage', 'colle', 'croquettes', 'déboucheur',
    'désodorisant', 'détergent', 'gant', 'insecticide', 'javel', 'lessive',
    'litière', 'nettoyant', 'pile', 'poubelle', 'sac', 'scotch', 'serpillière',
    'sopalin', 'torchon', 'vaisselle', 'éponge',
    'essuie-tout', 'savon de Marseille', 'vinaigre blanc', 'eau de javel',
  ],
};

/**
 * Les deux index construits au chargement.
 *
 * Ils sont bâtis une fois pour toutes, et toute incohérence du dictionnaire
 * arrête le démarrage plutôt que de s'écraser en silence — même parti pris que
 * `verifierCollisions` dans le chargeur de modules. Un terme écrit dans deux
 * rayons est une faute de saisie, jamais une nuance : le second gagnerait sans
 * qu'on le sache.
 */
const EXPRESSIONS = []; // [{ forme, poids, rayon }]
const MOTS = new Map(); // mot → rayon

for (const [rayon, termes] of Object.entries(DICTIONNAIRE)) {
  if (!CLES_RAYONS.includes(rayon)) throw new Error(`Rayon inconnu : ${rayon}.`);

  for (const terme of termes) {
    const forme = cleDeNom(terme);
    if (forme === '') throw new Error(`Terme sans mot dans « ${rayon} » : ${terme}.`);

    const mots = forme.split(' ');
    if (mots.length > 1) {
      EXPRESSIONS.push({ forme, poids: mots.length, rayon });
      continue;
    }

    // La garde attrape aussi « pomme » et « pommes » écrits dans deux rayons :
    // les deux se réduisent à la même forme indexée.
    const occupe = MOTS.get(forme);
    if (occupe) throw new Error(`« ${terme} » est déclaré dans « ${occupe} » et « ${rayon} ».`);
    MOTS.set(forme, rayon);
  }
}

// La plus longue expression est essayée d'abord, pour qu'une exception plus
// précise l'emporte sur une exception plus large.
EXPRESSIONS.sort((a, b) => b.poids - a.poids || b.forme.length - a.forme.length);

/**
 * Le rayon d'un article, d'après le seul dictionnaire.
 *
 * Deux passes, dans cet ordre :
 *   1. les expressions, qui sont les exceptions du français — « lait de coco »
 *      n'est pas de la crémerie, « eau de javel » n'est pas une boisson ;
 *   2. les mots isolés, **de gauche à droite**. En français, le nom principal
 *      d'un libellé de courses vient en premier et le reste le qualifie :
 *      « jus de pomme » est une boisson, « compote de pommes » de l'épicerie,
 *      « filet de poulet » de la boucherie. Le premier mot reconnu gagne, et
 *      c'est aussi ce qui range « sucre vanillé » sans avoir à l'écrire.
 */
export function classer(nom) {
  const cle = cleDeNom(nom);
  if (cle === '') return RAYON_PAR_DEFAUT;

  const entoure = ` ${cle} `;
  for (const { forme, rayon } of EXPRESSIONS) {
    if (entoure.includes(` ${forme} `)) return rayon;
  }

  for (const mot of cle.split(' ')) {
    if (LIAISONS.has(mot) || CONDITIONNEMENTS.has(mot)) continue;
    const rayon = MOTS.get(mot);
    if (rayon) return rayon;
  }

  return RAYON_PAR_DEFAUT;
}

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
export function choisirRayon(nom, rayonAppris) {
  if (rayonAppris && CLES_RAYONS.includes(rayonAppris)) return rayonAppris;
  return classer(nom);
}
