import { Link } from 'react-router-dom';

import { PlusIcon } from '../../../components/icons.jsx';
import { adresseRecette } from '../api.js';
import { PoigneeIcon } from '../PoigneeIcon.jsx';
import { RecetteIcon } from '../RecetteIcon.jsx';
import { CRENEAUX, libelleJour } from '../semaine.js';
import { T } from '../textes.js';

const estCase = (designee, date, slot) => designee?.date === date && designee.slot === slot;

/**
 * Une journée du planning : son nom, puis ses deux repas.
 *
 * Les créneaux sont empilés plutôt que côte à côte — sur 375 px, deux colonnes
 * couperaient « Gratin de courgettes » en deux, et la cible tactile tomberait
 * sous ce qu'on vise confortablement au pouce.
 *
 * Un repas qui porte une recette gagne une casserole au bout de sa ligne, qui
 * ouvre sa fiche. La ligne, elle, sert toujours à changer le repas : on
 * planifie une fois par semaine, mais on vient chaque jour voir ce qu'il y a à
 * préparer. Le geste courant a donc sa propre cible, comme le bouton « fait »
 * de l'entretien.
 *
 * Tout au bout, la **poignée** déplace le repas : glissée, elle l'emporte
 * jusqu'à une autre case ; touchée, elle ouvre le mode « Déplacer… »
 * (`useGlisser`). Elle reste à part de la ligne pour la même raison que la
 * casserole — on ne déplace pas un repas en voulant le changer. Chaque créneau
 * porte ses `data-*`, par lesquels le glisser trouve la case sous le doigt.
 *
 * En mode « Déplacer… » (`placement`), chaque ligne devient une case où poser
 * le repas en attente : casserole et poignée s'effacent — l'une ferait quitter
 * la page en plein geste, l'autre n'a plus d'objet —, et la case de départ,
 * estompée, annule si on la touche.
 */
export function DayRow({
  date,
  estAujourdhui,
  repasDe,
  recetteDe,
  intituleDe,
  placement,
  glisse,
  poignee,
  onOuvrir,
}) {
  return (
    <section
      className={[
        'overflow-hidden rounded-2xl bg-surface ring-1',
        estAujourdhui ? 'ring-brand-300' : 'ring-sand-200',
      ].join(' ')}
    >
      <h3
        className={[
          'flex items-baseline gap-2 px-4 py-2 text-sm font-medium first-letter:uppercase',
          estAujourdhui ? 'bg-brand-100 text-accent' : 'bg-sand-50 text-sand-700',
        ].join(' ')}
      >
        {libelleJour(date)}
        {/* L'espace est écrit, pas seulement dessiné : `gap-2` ne sépare que
            visuellement, et un lecteur d'écran annoncerait « lundi
            17aujourd'hui ». */}
        {estAujourdhui && <span className="text-xs font-normal">{' '}{T.jour.aujourdhui}</span>}
      </h3>

      {CRENEAUX.map((creneau, index) => {
        const slot = creneau.valeur;
        const repas = repasDe(date, slot);
        const intitule = intituleDe(repas);
        const recette = !placement ? recetteDe(repas) : null;
        // Un repas pas encore confirmé ne part nulle part : le serveur ne le
        // connaît pas encore sous cette forme.
        const saisissable = repas && !repas.pending && !placement;
        const estDepart = estCase(placement?.de, date, slot) || estCase(glisse?.de, date, slot);
        const estVisee = estCase(glisse?.vers, date, slot);

        return (
          <div
            key={slot}
            data-case={`${date} ${slot}`}
            data-date={date}
            data-slot={slot}
            className={[
              'flex transition-colors',
              index > 0 ? 'border-t border-sand-100' : '',
              // La case où le repas tomberait si on lâchait maintenant.
              estVisee ? 'bg-brand-100 outline-2 -outline-offset-2 outline-brand-600' : '',
              // Le repas « soulevé » : la ligne entière, casserole et poignée
              // comprises, estompée et cernée de pointillés à l'intérieur — que
              // la carte arrondie ne rogne pas.
              estDepart ? 'opacity-50 outline-2 -outline-offset-4 outline-sand-400 outline-dashed' : '',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onOuvrir(date, slot)}
              className={[
                'flex min-h-14 min-w-0 flex-1 items-center gap-3 pl-4 text-left active:bg-sand-50',
                // Une casserole ou une poignée au bout : la marge leur revient,
                // pour laisser au titre la largeur qu'il avait.
                recette || saisissable ? 'pr-2' : 'pr-4',
              ].join(' ')}
            >
              <span className="w-12 shrink-0 text-sm font-medium text-sand-500">
                {creneau.libelle}
              </span>

              {intitule ? (
                <span
                  className={[
                    'min-w-0 flex-1 break-words text-sand-900',
                    // Pas encore confirmé par le serveur : la case vient d'être
                    // posée ou réorganisée.
                    repas.pending ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  {intitule}
                </span>
              ) : (
                <span className="flex flex-1 items-center gap-1.5 text-sand-400">
                  <PlusIcon className="size-4" />
                  <span className="text-sm">{placement ? T.jour.poserIci : T.jour.rienDePrevu}</span>
                </span>
              )}

              {/* Ce que fera le toucher, dit au lecteur d'écran : la ligne ne
                  l'annonce que par son contenu. Une case vide dit déjà « Poser
                  ici ». */}
              {placement && (estDepart || intitule) && (
                <span className="sr-only">
                  {estDepart ? T.jour.aDeplacer : T.jour.poserIciLecteur}
                </span>
              )}
            </button>

            {/* Un lien et non un bouton : c'est une navigation, vers la page
                d'un autre module. Il n'apparaît que si la recette existe
                encore au répertoire — un pointeur caduc ne mènerait nulle
                part. */}
            {recette && (
              <Link
                to={adresseRecette(recette.id)}
                aria-label={T.jour.ouvrirRecette(recette.title)}
                className="grid min-h-14 w-12 shrink-0 place-items-center text-accent active:bg-brand-100"
              >
                <RecetteIcon className="size-6" />
              </Link>
            )}

            {/* `touch-none` : le doigt posé ici ne fait pas défiler la page, il
                saisit le repas. Le reste de la ligne défile normalement. */}
            {saisissable && (
              <button
                type="button"
                {...poignee({ date, slot }, intitule)}
                aria-label={T.jour.deplacer(intitule)}
                className="grid min-h-14 w-10 shrink-0 cursor-grab touch-none place-items-center text-sand-400 select-none active:cursor-grabbing active:bg-sand-50"
              >
                <PoigneeIcon className="size-5" />
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
