/**
 * Assemblage du registre des modules, à partir des fichiers collectés.
 *
 * Séparé de `registry.js` parce que celui-ci appelle `import.meta.glob`, résolu
 * par Vite et introuvable ailleurs : cette partie-ci n'est que de la logique,
 * et se vérifie donc avec le seul `node --test`.
 */

const CHAMPS_REQUIS = ['id', 'label', 'path', 'Component'];

/**
 * Ordre d'affichage des modules, partout : les tuiles du tableau de bord comme
 * les onglets de navigation.
 *
 * `tabOrder` place les modules du quotidien en tête ; ceux qui n'en déclarent
 * pas suivent, par ordre alphabétique. Une seule règle, appliquée aux deux
 * endroits — deux listes des mêmes modules dans deux ordres différents
 * obligeraient à réapprendre où regarder selon l'écran.
 */
export function comparerModules(a, b) {
  return (
    (a.tabOrder ?? Number.POSITIVE_INFINITY) - (b.tabOrder ?? Number.POSITIVE_INFINITY) ||
    a.label.localeCompare(b.label, 'fr')
  );
}

/**
 * @param {Record<string, { default?: object }>} charges
 *   Ce que renvoie `import.meta.glob` : le chemin du fichier, et son contenu.
 * @param {object} [options]
 * @param {(message: string) => void} [options.signaler]
 *   Où partent les modules écartés. Injectable pour que les tests les
 *   recueillent au lieu de les afficher.
 * @returns {Array<object>} les modules retenus, dans l'ordre d'affichage.
 *
 * Un module fautif est écarté, jamais fatal : l'application doit rester
 * utilisable même si l'un d'eux est mal déclaré. Mais l'écart est signalé
 * bruyamment — une tuile qui manque sans un mot serait bien pire à diagnostiquer
 * qu'une erreur en console.
 */
export function construireRegistre(charges, { signaler = console.error } = {}) {
  const retenus = [];
  const parId = new Map();
  const parChemin = new Map();

  for (const [fichier, importe] of Object.entries(charges)) {
    const definition = importe?.default;

    const manquants = CHAMPS_REQUIS.filter((champ) => !definition?.[champ]);
    if (manquants.length > 0) {
      signaler(`[modules] ${fichier} ignoré — champs manquants : ${manquants.join(', ')}`);
      continue;
    }

    // Deux modules de même identifiant, et React Router monte deux routes
    // concurrentes : celle qui gagne dépend de l'ordre de collecte, donc de
    // rien de visible.
    const idOccupe = parId.get(definition.id);
    if (idOccupe) {
      signaler(`[modules] ${fichier} ignoré — l'identifiant « ${definition.id} » est déjà pris par ${idOccupe}.`);
      continue;
    }

    const cheminOccupe = parChemin.get(definition.path);
    if (cheminOccupe) {
      signaler(`[modules] ${fichier} ignoré — la route « ${definition.path} » est déjà prise par ${cheminOccupe}.`);
      continue;
    }

    parId.set(definition.id, fichier);
    parChemin.set(definition.path, fichier);
    retenus.push(definition);
  }

  return retenus.sort(comparerModules);
}

/** Retrouve le module correspondant à une URL, pour le titre de l'en-tête. */
export function trouverModuleParChemin(modules, pathname) {
  return modules.find(
    (module) => pathname === module.path || pathname.startsWith(`${module.path}/`),
  );
}

/**
 * Nombre d'onglets qui tiennent côte à côte sur un téléphone.
 *
 * Cinq à 375 px de large laissent 75 px chacun : de quoi viser sans effort, et
 * de quoi lire un libellé court sous l'icône.
 */
const MAX_ONGLETS = 5;

const enOnglet = (module) => ({
  cle: module.id,
  // Un onglet n'a pas la place de « Liste de courses ».
  label: module.shortLabel ?? module.label,
  path: module.path,
  Icon: module.Icon,
});

/**
 * Onglets de la barre de navigation, déduits du registre.
 *
 * Tant que tout tient, l'accueil ouvre la marche et chaque module a son onglet.
 * Dès qu'il y a trop de modules, l'accueil cède sa place : le dernier onglet
 * devient « Plus », qui mène au tableau de bord — lequel les liste tous. On ne
 * garde pas les deux, ils mèneraient au même endroit.
 *
 * @returns {Array<{cle: string, label: string, path: string, Icon?: Function}>}
 */
export function construireOnglets(modules, { maxOnglets = MAX_ONGLETS } = {}) {
  // Le registre livre déjà les modules dans cet ordre ; on le réapplique pour
  // que la fonction reste juste quelle que soit la liste qu'on lui passe.
  const ordonnes = [...modules].sort(comparerModules);

  if (ordonnes.length + 1 <= maxOnglets) {
    return [{ cle: 'accueil', label: 'Accueil', path: '/' }, ...ordonnes.map(enOnglet)];
  }

  return [
    ...ordonnes.slice(0, maxOnglets - 1).map(enOnglet),
    { cle: 'plus', label: 'Plus', path: '/' },
  ];
}

/**
 * Onglet à mettre en évidence pour l'URL courante, ou `null`.
 *
 * Une page de module absent de la barre est représentée par « Plus » : sans
 * cela, ouvrir un module masqué n'allumerait rien et l'on se croirait nulle
 * part. La page du compte, elle, n'est dans aucun onglet et n'en allume aucun —
 * on y accède par l'avatar, pas par la barre.
 */
export function ongletActif(onglets, pathname, modules = []) {
  const surUnOnglet = onglets.find(
    (onglet) =>
      onglet.path !== '/' && (pathname === onglet.path || pathname.startsWith(`${onglet.path}/`)),
  );
  if (surUnOnglet) return surUnOnglet.cle;

  if (pathname === '/') return onglets.find((onglet) => onglet.path === '/')?.cle ?? null;

  const moduleMasque = trouverModuleParChemin(modules, pathname);
  if (moduleMasque) return onglets.find((onglet) => onglet.cle === 'plus')?.cle ?? null;

  return null;
}
