import { useEffect, useState } from 'react';

import { ArrowLeftIcon, CheckIcon, ChevronDownIcon } from '../../../components/icons.jsx';
import { useEcranAllume } from '../ecran.js';
import { ecrireProgression, effacerProgression, lireProgression } from '../progression.js';
import { T } from '../textes.js';

/**
 * Suivre une recette pendant qu'on la cuisine.
 *
 * Pleine page et non un panneau glissé, contrairement à tout le reste de
 * l'application : ce n'est pas un formulaire qu'on remplit avant de revenir à
 * son écran, c'est là qu'on reste vingt minutes, les mains occupées. Tout ce qui
 * n'est pas la marche à suivre sort donc du champ — barre d'onglets comprise.
 *
 * Trois choses en découlent :
 *   — le texte est plus grand qu'ailleurs : on lit son téléphone posé sur le
 *     plan de travail, à un bras de distance, pas à trente centimètres ;
 *   — la cible tactile d'une étape occupe toute sa ligne. On vise mal avec le
 *     dos d'un doigt fariné ;
 *   — les ingrédients sont là, repliés. On y revient sans cesse — « c'était
 *     combien de crème ? » — et repartir vers la fiche perdrait la place.
 */
export function CookingMode({ recette, onClose }) {
  const [cochees, setCochees] = useState(
    () => new Set(lireProgression(recette.id, recette.steps)),
  );
  const [ingredientsOuverts, setIngredientsOuverts] = useState(false);

  const ecranAllume = useEcranAllume(true);

  useEffect(() => {
    ecrireProgression(recette.id, [...cochees]);
  }, [cochees, recette.id]);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  function basculer(id) {
    setCochees((precedentes) => {
      const suivantes = new Set(precedentes);
      if (suivantes.has(id)) suivantes.delete(id);
      else suivantes.add(id);
      return suivantes;
    });
  }

  function recommencer() {
    effacerProgression(recette.id);
    setCochees(new Set());
  }

  const total = recette.steps.length;
  const faites = recette.steps.filter((step) => cochees.has(step.id)).length;
  const termine = faites === total;

  return (
    <div role="dialog" aria-modal="true" aria-label={T.cuisine.dialogue(recette.title)} className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="pt-safe shrink-0 bg-surface-haute shadow-sm">
        <div className="mx-auto flex min-h-14 w-full max-w-2xl items-center gap-2 px-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={T.cuisine.quitter}
            className="grid size-11 shrink-0 place-items-center rounded-full text-sand-600 active:bg-sand-200"
          >
            <ArrowLeftIcon className="size-5" />
          </button>

          <h2 className="min-w-0 flex-1 truncate font-titre text-lg font-medium text-sand-900">{recette.title}</h2>

          <span className="shrink-0 text-sm tabular-nums text-sand-500">
            {faites} / {total}
          </span>

          {faites > 0 && (
            <button
              type="button"
              onClick={recommencer}
              className="min-h-11 shrink-0 px-2 text-sm font-medium text-accent"
            >
              {T.cuisine.recommencer}
            </button>
          )}
        </div>

        {/* Une barre plutôt qu'un simple compteur : d'un coup d'œil, de loin,
            entre deux gestes. `aria-hidden`, le compteur au-dessus disant déjà
            la même chose en toutes lettres. */}
        <div className="h-1 w-full bg-sand-200" aria-hidden="true">
          <div
            className="h-full bg-brand-600 transition-[width] duration-300"
            style={{ width: total === 0 ? '0%' : `${(faites / total) * 100}%` }}
          />
        </div>
      </header>

      <div className="pb-safe flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-4">
          <button
            type="button"
            onClick={() => setIngredientsOuverts((ouvert) => !ouvert)}
            aria-expanded={ingredientsOuverts}
            className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-surface-haute px-4 text-left ring-1 ring-sand-200 active:bg-sand-100"
          >
            <span className="flex-1 font-medium text-sand-700">
              {T.fiche.ingredients}
              <span className="ml-1.5 font-normal text-sand-500">
                ({recette.ingredients.length})
              </span>
            </span>
            <ChevronDownIcon
              className={['size-5 shrink-0 text-sand-500 transition-transform', ingredientsOuverts ? 'rotate-180' : ''].join(' ')}
            />
          </button>

          {ingredientsOuverts && (
            <ul className="mt-2 divide-y divide-sand-100 rounded-xl bg-surface-haute ring-1 ring-sand-200">
              {recette.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 break-words text-sand-900">{ingredient.name}</span>
                  {ingredient.quantity && (
                    <span className="shrink-0 text-sm text-sand-500">{ingredient.quantity}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <ol className="mt-4 space-y-2">
            {recette.steps.map((step, rang) => {
              const faite = cochees.has(step.id);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => basculer(step.id)}
                    aria-pressed={faite}
                    className={[
                      'flex w-full items-start gap-3 rounded-xl px-4 py-4 text-left ring-1 transition',
                      faite
                        ? 'bg-sand-100 ring-sand-200/70'
                        : 'bg-surface-haute ring-sand-200 active:bg-sand-100',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'grid size-7 shrink-0 place-items-center rounded-full text-sm font-medium transition',
                        faite ? 'bg-brand-600 text-sur-marque' : 'bg-sand-200 text-sand-600',
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {faite ? <CheckIcon className="size-4" strokeWidth={3} /> : rang + 1}
                    </span>

                    <span
                      className={[
                        'min-w-0 flex-1 break-words text-lg leading-relaxed',
                        faite ? 'text-sand-400 line-through' : 'text-sand-900',
                      ].join(' ')}
                    >
                      {step.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {termine && (
            <div className="mt-4 rounded-xl bg-brand-100 px-4 py-5 text-center">
              <p className="font-medium text-accent">{T.cuisine.pret}</p>
              <button
                type="button"
                onClick={() => {
                  recommencer();
                  onClose();
                }}
                className="mt-2 min-h-11 text-sm font-medium text-accent underline"
              >
                {T.cuisine.terminer}
              </button>
            </div>
          )}

          {recette.notes && (
            <div className="mt-6">
              <p className="text-sm font-medium text-sand-700">{T.fiche.remarques}</p>
              <p className="mt-2 rounded-xl bg-surface-haute px-4 py-3 text-sand-800 ring-1 ring-sand-200 whitespace-pre-line">
                {recette.notes}
              </p>
            </div>
          )}

          {/* Dit, plutôt que promis en silence : sans `wakeLock` — Safari
              ancien, connexion non chiffrée — l'écran suit le réglage du
              téléphone, et mieux vaut le savoir avant d'avoir les mains
              pleines. */}
          <p className="mt-6 text-center text-xs text-sand-500">
            {ecranAllume ? T.cuisine.ecranAllume : T.cuisine.ecranLibre}
          </p>
        </div>
      </div>
    </div>
  );
}
