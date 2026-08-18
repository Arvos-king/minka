import { useEffect, useState } from 'react';

import { derniereSynchro, libelleAnciennete, useEnLigne } from '../lib/reseau.js';

/**
 * Bandeau « hors ligne », sous l'en-tête.
 *
 * Sans réseau, le service worker sert les lectures depuis son cache : la liste
 * s'affiche au lieu d'une erreur, ce qui est tout l'intérêt en magasin. Mais
 * elle peut dater, et rien dans la réponse ne le dit — d'où ce bandeau, qui
 * annonce l'âge de la dernière lecture faite en ligne.
 *
 * Il prévient aussi que les modifications ne passeront pas : les écritures ne
 * sont pas mises en file d'attente, cocher un article échouera.
 */
export function OfflineBanner() {
  const enLigne = useEnLigne();
  const [instant, setInstant] = useState(() => Date.now());

  // Hors ligne, l'âge affiché vieillit : « il y a 5 min » ne doit pas rester
  // figé une heure durant.
  useEffect(() => {
    if (enLigne) return undefined;

    const minuteur = setInterval(() => setInstant(Date.now()), 60_000);
    return () => clearInterval(minuteur);
  }, [enLigne]);

  if (enLigne) return null;

  const anciennete = libelleAnciennete(derniereSynchro(), instant);

  return (
    <p
      role="status"
      className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900"
    >
      Hors ligne
      {anciennete && <> — données {anciennete}</>}
      {'. '}
      <span className="font-normal">Les modifications ne seront pas enregistrées.</span>
    </p>
  );
}
