import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { T } from '../textes.js';

/**
 * Le mode « Déplacer… » : un repas attend sa case.
 *
 * Un bandeau plutôt qu'un panneau : la semaine doit rester visible et
 * défilable derrière, flèches comprises — c'est ce qui permet de poser un repas
 * sur une autre semaine. Ancré au-dessus de la barre d'onglets, comme les
 * champs d'ajout, et dans les couleurs inversées de l'invite de mise à jour.
 *
 * Le rappel de la règle n'est pas décoratif : sur une case occupée, le repas
 * s'insère et pousse la suite, et c'est avant de toucher qu'on veut le savoir.
 */
export function BandeauPlacement({ intitule, onAnnuler }) {
  return (
    <div className="bottom-onglets fixed inset-x-0 z-20 px-3 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-sand-900 px-4 py-3 text-fond shadow-lg">
        <p role="status" className="min-w-0 flex-1 text-sm">
          <span className="font-medium">{T.bandeaux.ouPoser(intitule)}</span>{' '}
          <span className="opacity-75">{T.bandeaux.pousseLaSuite}</span>
        </p>
        <Button size="sm" variant="secondary" onClick={onAnnuler} className="shrink-0">
          {SOCLE.commun.annuler}
        </Button>
      </div>
    </div>
  );
}
