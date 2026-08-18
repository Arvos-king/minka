import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { PencilIcon } from '../PencilIcon.jsx';
import { CRENEAUX, libelleJour } from '../semaine.js';

/**
 * Choix du repas d'une case, glissé depuis le bas.
 *
 * Trois façons de remplir une case, dans l'ordre où on s'en sert :
 *   — reprendre une recette du répertoire, le cas courant ;
 *   — écrire un texte libre — « restes », « resto », « chez mes parents » —,
 *     qui représente la moitié des dîners d'une vraie semaine et ne mérite pas
 *     qu'on lui crée une fiche ;
 *   — créer une recette, quand on sait qu'elle reviendra.
 */
export function MealSheet({
  date,
  creneau,
  repas,
  recipes,
  onChoisir,
  onVider,
  onNouvelleRecette,
  onModifierRecette,
  onClose,
}) {
  const [recherche, setRecherche] = useState('');
  const [texteLibre, setTexteLibre] = useState(repas?.freeText ?? '');
  const champRecherche = useRef(null);

  useEffect(() => {
    champRecherche.current?.focus();
  }, []);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  const terme = recherche.trim().toLocaleLowerCase('fr');
  const visibles = terme
    ? recipes.filter((recette) => recette.title.toLocaleLowerCase('fr').includes(terme))
    : recipes;

  const libelleCreneau = CRENEAUX.find((c) => c.valeur === creneau)?.libelle ?? creneau;

  function poserTexteLibre(evenement) {
    evenement.preventDefault();
    const valeur = texteLibre.trim();
    if (valeur === '') return;

    onChoisir({ freeText: valeur });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-sand-900/40" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Repas du ${libelleJour(date)}, ${libelleCreneau}`}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-sand-50 px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900 first-letter:uppercase">
          {libelleJour(date)} — {libelleCreneau}
        </h2>

        <form onSubmit={poserTexteLibre} className="mt-4">
          <label htmlFor="menus-texte-libre" className="text-sm font-medium text-sand-700">
            Sans recette
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="menus-texte-libre"
              value={texteLibre}
              onChange={(e) => setTexteLibre(e.target.value)}
              placeholder="Restes, resto…"
              maxLength={120}
              className="min-h-12 flex-1 rounded-xl bg-white px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
            />
            <Button type="submit" disabled={texteLibre.trim() === ''}>
              Poser
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-sand-700">Mes recettes</p>
            <button
              type="button"
              onClick={onNouvelleRecette}
              className="min-h-9 text-sm font-medium text-brand-700"
            >
              Nouvelle recette
            </button>
          </div>

          {recipes.length > 3 && (
            <input
              ref={champRecherche}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher…"
              aria-label="Chercher une recette"
              className="mt-2 min-h-11 w-full rounded-xl bg-white px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
            />
          )}

          {visibles.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-sand-500">
              {recipes.length === 0
                ? 'Aucune recette pour le moment.'
                : 'Aucune recette ne correspond.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {visibles.map((recette) => {
                const posee = repas?.recipeId === recette.id;
                return (
                  <li
                    key={recette.id}
                    className={[
                      'flex items-center rounded-xl ring-1 transition',
                      posee ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-sand-200',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onChoisir({ recipeId: recette.id, recipeTitle: recette.title });
                        onClose();
                      }}
                      aria-pressed={posee}
                      className="flex min-h-14 flex-1 items-center gap-2 rounded-l-xl px-4 text-left active:bg-sand-50/60"
                    >
                      <span
                        className={[
                          'min-w-0 flex-1 break-words',
                          posee ? 'text-brand-900' : 'text-sand-900',
                        ].join(' ')}
                      >
                        {recette.title}
                      </span>
                      {recette.servings && (
                        <span className="shrink-0 text-sm text-sand-500">{recette.servings} parts</span>
                      )}
                    </button>

                    {/* Action secondaire à part, comme la corbeille d'un article
                        de courses : viser « modifier » ne doit pas poser la
                        recette dans le planning par erreur. */}
                    <button
                      type="button"
                      onClick={() => onModifierRecette(recette.id)}
                      aria-label={`Modifier ${recette.title}`}
                      className="grid min-h-14 w-14 shrink-0 place-items-center rounded-r-xl text-sand-400 active:bg-sand-100"
                    >
                      <PencilIcon className="size-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 flex gap-2 pb-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          {repas && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onVider();
                onClose();
              }}
              className="flex-1 text-red-700"
            >
              Vider la case
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
