import { PlusIcon } from '../../../components/icons.jsx';
import { CRENEAUX, libelleJour } from '../semaine.js';

/**
 * Une journée du planning : son nom, puis ses deux repas.
 *
 * Les créneaux sont empilés plutôt que côte à côte — sur 375 px, deux colonnes
 * couperaient « Gratin de courgettes » en deux, et la cible tactile tomberait
 * sous ce qu'on vise confortablement au pouce.
 */
export function DayRow({ date, estAujourdhui, repasDe, intituleDe, onOuvrir }) {
  return (
    <section
      className={[
        'overflow-hidden rounded-2xl bg-surface ring-1',
        estAujourdhui ? 'ring-brand-300' : 'ring-sand-200',
      ].join(' ')}
    >
      <h3
        className={[
          'flex items-baseline gap-2 px-4 py-2 text-sm font-semibold first-letter:uppercase',
          estAujourdhui ? 'bg-brand-50 text-accent' : 'bg-sand-50 text-sand-700',
        ].join(' ')}
      >
        {libelleJour(date)}
        {/* L'espace est écrit, pas seulement dessiné : `gap-2` ne sépare que
            visuellement, et un lecteur d'écran annoncerait « lundi
            17aujourd'hui ». */}
        {estAujourdhui && <span className="text-xs font-normal">{' '}· aujourd'hui</span>}
      </h3>

      {CRENEAUX.map((creneau, index) => {
        const repas = repasDe(date, creneau.valeur);
        const intitule = intituleDe(repas);

        return (
          <button
            key={creneau.valeur}
            type="button"
            onClick={() => onOuvrir(date, creneau.valeur)}
            className={[
              'flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-sand-50',
              index > 0 ? 'border-t border-sand-100' : '',
            ].join(' ')}
          >
            <span className="w-12 shrink-0 text-sm font-medium text-sand-500">
              {creneau.libelle}
            </span>

            {intitule ? (
              <span className="min-w-0 flex-1 break-words text-sand-900">{intitule}</span>
            ) : (
              <span className="flex flex-1 items-center gap-1.5 text-sand-400">
                <PlusIcon className="size-4" />
                <span className="text-sm">Rien de prévu</span>
              </span>
            )}
          </button>
        );
      })}
    </section>
  );
}
