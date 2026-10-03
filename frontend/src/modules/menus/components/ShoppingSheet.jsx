import { useEffect, useState } from 'react';

import { CheckIcon } from '../../../components/icons.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { menusApi } from '../api.js';
import { T } from '../textes.js';

/**
 * Envoi des ingrédients de la semaine dans la liste de courses.
 *
 * La boucle que ferme le module : frigo → menus → courses. Le contenu envoyé
 * est montré **tel qu'il arrivera** dans la liste, décoché ligne à ligne — on a
 * toujours déjà l'huile d'olive, et découvrir après coup vingt articles à
 * retirer découragerait de s'en servir une seconde fois.
 *
 * Trois modules sont en jeu et aucun ne connaît le code des deux autres : le
 * planning sait quelles recettes sont posées, le module recettes sait
 * regrouper leurs ingrédients et en écrire le libellé, celui des courses sait
 * les ranger par rayon. Chacun reçoit ce qu'il lui faut par HTTP, et rien de
 * plus.
 */
export function ShoppingSheet({ recipeIds, onClose }) {
  const [ingredients, setIngredients] = useState(null);
  const [ecartes, setEcartes] = useState(() => new Set());
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);

  useEffect(() => {
    let annule = false;

    menusApi
      .ingredientsDeRecettes(recipeIds)
      .then((data) => {
        if (!annule) setIngredients(data.ingredients);
      })
      .catch((apiError) => {
        if (!annule) setErreur(apiError.message);
      });

    return () => {
      annule = true;
    };
  }, [recipeIds]);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  const retenus = (ingredients ?? []).filter((ingredient) => !ecartes.has(ingredient.name));

  function basculer(nom) {
    setEcartes((precedents) => {
      const suivants = new Set(precedents);
      if (suivants.has(nom)) suivants.delete(nom);
      else suivants.add(nom);
      return suivants;
    });
  }

  async function envoyer() {
    setErreur(null);
    setEnvoi(true);

    try {
      /*
       * En série plutôt qu'en parallèle : la liste de courses trie par ordre
       * d'ajout, et vingt requêtes simultanées y arriveraient dans le désordre.
       */
      for (const ingredient of retenus) {
        await menusApi.ajouterAuxCourses(ingredient.label);
      }
      setResultat(retenus.length);
    } catch (apiError) {
      setErreur(apiError.message);
      setEnvoi(false);
    }
  }

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
        aria-label={T.courses.dialogue}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">{T.courses.titre}</h2>

        {resultat !== null ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-100 text-accent">
              <CheckIcon className="size-6" strokeWidth={2.5} />
            </span>
            <p className="mt-3 font-medium text-sand-900">
              {T.courses.ajoutes(resultat)}
            </p>
            <p className="mt-1 text-sm text-sand-500">{T.courses.attendent}</p>
            <Button type="button" onClick={onClose} className="mt-5 w-full">
              {SOCLE.commun.fermer}
            </Button>
          </div>
        ) : (
          <>
            {ingredients === null && !erreur && (
              <p className="py-8 text-center text-sm text-sand-500">{SOCLE.chargement}</p>
            )}

            {ingredients?.length === 0 && (
              <p className="mt-4 rounded-xl border border-dashed border-sand-300 px-4 py-8 text-center text-sm text-sand-500">
                {T.courses.aucunIngredient}
              </p>
            )}

            {ingredients && ingredients.length > 0 && (
              <>
                <p className="mt-1 text-sm text-sand-500">
                  {T.courses.decocher}
                </p>

                <ul className="mt-3 space-y-1.5">
                  {ingredients.map((ingredient) => {
                    const retenu = !ecartes.has(ingredient.name);
                    return (
                      <li key={ingredient.name}>
                        <button
                          type="button"
                          onClick={() => basculer(ingredient.name)}
                          aria-pressed={retenu}
                          className={[
                            'flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left ring-1 transition',
                            retenu ? 'bg-surface ring-sand-200' : 'bg-sand-100 ring-sand-200/70',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
                              retenu ? 'border-brand-600 bg-brand-600 text-white' : 'border-sand-300',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {retenu && <CheckIcon className="size-4" strokeWidth={3} />}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={[
                                'block break-words',
                                retenu ? 'text-sand-900' : 'text-sand-400 line-through',
                              ].join(' ')}
                            >
                              {ingredient.label}
                            </span>
                            <span className="block truncate text-xs text-sand-500">
                              {ingredient.recipes.join(', ')}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {erreur && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
                {erreur}
              </p>
            )}

            <div className="mt-5 flex gap-2 pb-4">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                {SOCLE.commun.annuler}
              </Button>
              <Button
                type="button"
                onClick={envoyer}
                loading={envoi}
                disabled={retenus.length === 0}
                className="flex-1"
              >
                {T.courses.envoyer(retenus.length)}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
