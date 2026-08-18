/**
 * Ce qu'une note montre d'elle-même dans la liste.
 *
 * Le titre est facultatif : on note souvent trois lignes sans penser à en
 * donner un. Plutôt que d'imposer un champ de plus avant de pouvoir écrire, on
 * le déduit de la première ligne — c'est ce que fait n'importe quelle
 * application de notes, et c'est presque toujours le bon choix.
 */

const LONGUEUR_TITRE = 60;
const LONGUEUR_EXTRAIT = 120;

const premiereLigne = (texte) =>
  (texte ?? '').split('\n').find((ligne) => ligne.trim() !== '')?.trim() ?? '';

function tronquer(texte, maximum) {
  return texte.length <= maximum ? texte : `${texte.slice(0, maximum - 1).trimEnd()}…`;
}

/** Le titre saisi, à défaut la première ligne du corps, à défaut rien. */
export function titreAffiche(note) {
  const saisi = (note?.title ?? '').trim();
  if (saisi !== '') return tronquer(saisi, LONGUEUR_TITRE);

  const deduit = premiereLigne(note?.body);
  return deduit === '' ? '' : tronquer(deduit, LONGUEUR_TITRE);
}

/**
 * Aperçu du contenu, sur une ligne.
 *
 * Quand le titre vient du corps, la première ligne est sautée : la répéter
 * juste en dessous ne dirait rien de plus.
 */
export function extrait(note) {
  const lignes = (note?.body ?? '').split('\n');
  const sansTitre = (note?.title ?? '').trim() === '';

  const restantes = sansTitre
    ? lignes.slice(lignes.findIndex((ligne) => ligne.trim() !== '') + 1)
    : lignes;

  const texte = restantes.join(' ').replace(/\s+/g, ' ').trim();
  return tronquer(texte, LONGUEUR_EXTRAIT);
}

/** Une note sans titre saisi ni corps : elle existe, mais ne dit rien encore. */
export function estVide(note) {
  return (note?.title ?? '').trim() === '' && (note?.body ?? '').trim() === '';
}

const formatDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const formatDateAvecAnnee = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « le 12 août ».
 *
 * Au-delà d'une journée on donne la date plutôt qu'un décompte : « il y a
 * 23 j » demande un calcul mental que « le 26 juillet » épargne.
 */
export function libelleModification(instant, maintenant = Date.now()) {
  if (!instant) return null;

  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;

  const minutes = Math.floor((maintenant - date.getTime()) / 60_000);
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  if (heures < 48) return 'hier';

  const memeAnnee = date.getFullYear() === new Date(maintenant).getFullYear();
  return `le ${(memeAnnee ? formatDate : formatDateAvecAnnee).format(date)}`;
}
