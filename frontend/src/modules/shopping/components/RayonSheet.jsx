import { useEffect, useRef } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { T } from '../textes.js';

/**
 * Choix du rayon d'un article, glissé depuis le bas.
 *
 * Le panneau ne demande rien d'autre : un rayon se choisit d'un tap, et la
 * fermeture suit immédiatement. L'action étant optimiste, la liste derrière est
 * déjà à jour ; un refus du serveur remonte par le bandeau d'erreur de la page.
 *
 * La phrase sous les pilules n'est pas décorative : elle prévient que le choix
 * vaudra pour les prochains ajouts du même produit, ce qui est exactement ce
 * qu'on veut savoir avant de toucher une pilule.
 */
export function RayonSheet({ item, rayons, onRanger, onClose }) {
  const rayonActif = useRef(null);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  // Le panneau s'ouvre aussi au clavier : sans ce focus, la tabulation
  // repartirait du haut du document et le chemin s'arrêterait là.
  useEffect(() => {
    rayonActif.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={SOCLE.commun.fermer}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={T.rayon.dialogue}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">{T.rayon.titre}</h2>
        <p className="mt-1 truncate text-sm text-sand-500">{item.name}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {rayons.map((rayon) => {
            const actif = item.rayon === rayon.cle;

            return (
              <button
                key={rayon.cle}
                ref={actif ? rayonActif : null}
                type="button"
                onClick={() => {
                  onRanger(rayon.cle);
                  onClose();
                }}
                aria-pressed={actif}
                // `min-h-11` : en dessous de 44 px, une pilule n'est pas visable
                // au pouce, et c'est un écran qu'on utilise debout.
                className={[
                  'min-h-11 rounded-full px-3.5 text-sm font-medium transition-colors',
                  actif ? 'bg-brand-600 text-sur-marque' : 'bg-sand-50 text-sand-600 ring-1 ring-sand-300',
                ].join(' ')}
              >
                {rayon.libelle}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-sand-500">{T.rayon.vaudraAussi(item.name)}</p>

        <div className="py-4">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">
            {SOCLE.commun.fermer}
          </Button>
        </div>
      </div>
    </div>
  );
}
