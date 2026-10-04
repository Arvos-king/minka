import { useEffect, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { T } from '../textes.js';

/** Le temps de voir le résultat, et de changer d'avis. */
const DUREE = 8000;

/**
 * Ce qui vient de bouger, et de quoi le défaire.
 *
 * Un repas glissé se lâche parfois une case trop tôt, et une poussée peut
 * déplacer toute la fin de semaine : quelques secondes pour revenir en arrière
 * d'un tap valent mieux qu'une confirmation avant chaque geste.
 *
 * Le décompte s'arrête tant que le doigt, la souris ou le clavier est sur le
 * bandeau — on n'enlève pas un bouton à qui est en train de l'atteindre — et
 * repart à zéro à chaque nouvelle réorganisation.
 */
export function BandeauAnnulation({ annulation, onAnnuler, onFermer }) {
  const [retenu, setRetenu] = useState(false);

  useEffect(() => {
    if (retenu) return undefined;
    const minuteur = setTimeout(onFermer, DUREE);
    return () => clearTimeout(minuteur);
  }, [annulation, retenu, onFermer]);

  return (
    <div className="bottom-onglets fixed inset-x-0 z-20 px-3 py-3">
      <div
        onPointerEnter={() => setRetenu(true)}
        onPointerLeave={() => setRetenu(false)}
        onFocus={() => setRetenu(true)}
        onBlur={() => setRetenu(false)}
        className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-sand-900 px-4 py-3 text-fond shadow-lg"
      >
        <p role="status" className="min-w-0 flex-1 text-sm">
          {annulation.resume}
        </p>
        <Button size="sm" onClick={onAnnuler} className="shrink-0">
          {T.bandeaux.annuler}
        </Button>
      </div>
    </div>
  );
}
