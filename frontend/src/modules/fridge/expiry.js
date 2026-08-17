/**
 * Calcul des échéances de péremption.
 *
 * Tout se fait ici, côté client, et non sur le serveur : la date qui compte
 * est celle du téléphone de la personne qui ouvre le frigo. Cela évite aussi
 * d'avoir deux logiques de date, l'une pour l'affichage et l'autre pour le
 * classement.
 */

/** Nombre de jours en deçà duquel un produit est signalé comme urgent. */
const SEUIL_BIENTOT = 3;

/** Date du jour au format AAAA-MM-JJ, dans le fuseau local. */
export function aujourdhui() {
  const maintenant = new Date();
  // On soustrait le décalage avant de sérialiser : `toISOString()` bascule en
  // UTC et ferait changer de jour en soirée depuis la France.
  const decalage = maintenant.getTimezoneOffset() * 60_000;
  return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

/** Convertit AAAA-MM-JJ en instant UTC, pour comparer des jours entre eux. */
function versJourUtc(date) {
  const [annee, mois, jour] = date.split('-').map(Number);
  return Date.UTC(annee, mois - 1, jour);
}

/**
 * Nombre de jours séparant aujourd'hui de la date donnée (négatif si passée).
 * Le passage par UTC évite qu'un changement d'heure fasse gagner ou perdre
 * une journée.
 */
export function joursRestants(expiresOn) {
  return Math.round((versJourUtc(expiresOn) - versJourUtc(aujourdhui())) / 86_400_000);
}

const formatCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/**
 * @returns {{ niveau: 'aucun'|'perime'|'aujourdhui'|'bientot'|'ok', libelle: string|null, jours: number|null }}
 */
export function statutPeremption(expiresOn) {
  if (!expiresOn) return { niveau: 'aucun', libelle: null, jours: null };

  const jours = joursRestants(expiresOn);

  if (jours < 0) {
    return {
      niveau: 'perime',
      libelle: jours === -1 ? 'Périmé hier' : `Périmé depuis ${Math.abs(jours)} j`,
      jours,
    };
  }
  if (jours === 0) return { niveau: 'aujourdhui', libelle: "Aujourd'hui", jours };
  if (jours === 1) return { niveau: 'bientot', libelle: 'Demain', jours };
  if (jours <= SEUIL_BIENTOT) return { niveau: 'bientot', libelle: `Dans ${jours} j`, jours };

  return {
    niveau: 'ok',
    libelle: formatCourt.format(new Date(`${expiresOn}T12:00:00`)),
    jours,
  };
}

/** Classes d'affichage du badge, par niveau. */
export const STYLES_BADGE = {
  perime: 'bg-red-100 text-red-800',
  aujourdhui: 'bg-orange-100 text-orange-800',
  bientot: 'bg-amber-100 text-amber-800',
  ok: 'bg-sand-200 text-sand-600',
  aucun: '',
};

/** Décalage en jours par rapport à aujourd'hui, au format attendu par l'API. */
export function dansNJours(n) {
  const date = new Date(versJourUtc(aujourdhui()) + n * 86_400_000);
  return date.toISOString().slice(0, 10);
}
