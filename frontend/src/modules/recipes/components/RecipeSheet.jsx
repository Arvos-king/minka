import { useEffect } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { T } from '../textes.js';

/**
 * La fiche d'une recette, en lecture.
 *
 * Elle existe parce qu'on ouvre une recette pour la lire bien plus souvent que
 * pour la modifier : entrer dans un formulaire pour retrouver la quantité de
 * crème, c'est mettre tout le texte dans des champs de saisie, où il devient
 * plus dur à lire et modifiable par mégarde.
 */
export function RecipeSheet({ recette, onCuisiner, onModifier, onClose }) {
  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

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
        aria-label={recette.title}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">{recette.title}</h2>
        {recette.servings && <p className="mt-0.5 text-sm text-sand-500">{T.pour(recette.servings)}</p>}

        {recette.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {recette.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-sand-200 px-2.5 py-1 text-xs text-sand-700"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <p className="text-sm font-medium text-sand-700">{T.fiche.ingredients}</p>

          {recette.ingredients.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-sand-300 px-4 py-5 text-center text-sm text-sand-500">
              {T.fiche.aucunIngredient}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-sand-100 rounded-xl bg-surface ring-1 ring-sand-200">
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
        </div>

        {recette.steps.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-sand-700">{T.fiche.preparation}</p>
            {/* Numérotée par `<ol>`, et non par un nombre écrit dans le texte :
                c'est la structure qui porte l'ordre, un lecteur d'écran
                l'annonce, et rien à renuméroter quand une étape est insérée. */}
            <ol className="mt-2 list-decimal space-y-2 rounded-xl bg-surface py-3 pr-4 pl-9 text-sand-800 ring-1 ring-sand-200 marker:text-sand-400">
              {recette.steps.map((step) => (
                <li key={step.id} className="break-words">
                  {step.text}
                </li>
              ))}
            </ol>
          </div>
        )}

        {recette.notes && (
          <div className="mt-5">
            <p className="text-sm font-medium text-sand-700">{T.fiche.remarques}</p>
            {/* `whitespace-pre-line` : le texte a été saisi avec ses retours à
                la ligne, et les perdre collerait tout en un bloc. */}
            <p className="mt-2 rounded-xl bg-surface px-4 py-3 text-sand-800 ring-1 ring-sand-200 whitespace-pre-line">
              {recette.notes}
            </p>
          </div>
        )}

        <div className="mt-6 pb-4">
          {/* Ce bouton est la raison d'être du module : une recette se lit pour
              être cuisinée. Il passe donc devant, pleine largeur — modifier est
              l'action rare. */}
          {recette.steps.length > 0 && (
            <Button type="button" onClick={onCuisiner} className="mb-2 w-full">
              {T.fiche.cuisiner}
            </Button>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {SOCLE.commun.fermer}
            </Button>
            <Button
              type="button"
              variant={recette.steps.length > 0 ? 'secondary' : 'primary'}
              onClick={onModifier}
              className="flex-1"
            >
              {T.fiche.modifier}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
