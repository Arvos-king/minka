/**
 * Couleurs d'attribution des événements.
 *
 * La teinte est déduite de l'identifiant plutôt que stockée en base : cela
 * évite d'ajouter une colonne à la table des comptes, qui appartient au socle,
 * et reste stable dans le temps puisqu'un identifiant ne change pas.
 */

const PALETTE = [
  { pastille: 'bg-sky-500', fond: 'bg-sky-50', texte: 'text-sky-800', bordure: 'ring-sky-200' },
  { pastille: 'bg-violet-500', fond: 'bg-violet-50', texte: 'text-violet-800', bordure: 'ring-violet-200' },
  { pastille: 'bg-rose-500', fond: 'bg-rose-50', texte: 'text-rose-800', bordure: 'ring-rose-200' },
  { pastille: 'bg-teal-500', fond: 'bg-teal-50', texte: 'text-teal-800', bordure: 'ring-teal-200' },
];

/** Événement concernant tout le foyer. */
const COMMUN = {
  pastille: 'bg-brand-600',
  fond: 'bg-brand-50',
  texte: 'text-brand-800',
  bordure: 'ring-brand-200',
};

export function couleurPersonne(ownerId) {
  if (ownerId === null || ownerId === undefined) return COMMUN;
  // Les identifiants commencent à 1 : on les ramène à un index à partir de 0.
  return PALETTE[(ownerId - 1) % PALETTE.length];
}

export function nomPersonne(ownerId, people) {
  if (ownerId === null || ownerId === undefined) return 'Tout le monde';
  return people.find((personne) => personne.id === ownerId)?.displayName ?? 'Inconnu';
}
