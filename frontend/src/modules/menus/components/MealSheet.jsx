import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { CRENEAUX, libelleJour } from '../semaine.js';

/**
 * Choix du repas d'une case, glissé depuis le bas.
 *
 * **Un seul champ**, et trois façons de s'en servir :
 *   — on tape, la liste des recettes se filtre, on en touche une. Le cas
 *     courant ;
 *   — on tape autre chose et on pose le texte tel quel — « restes », « resto »,
 *     « chez mes parents » —, ce qui représente la moitié des dîners d'une
 *     vraie semaine et ne mérite pas qu'on lui crée une fiche ;
 *   — on tape un plat qui reviendra, et on en fait une recette d'un tap. Elle
 *     naît avec son seul intitulé : planifier la semaine n'est pas le moment de
 *     dresser une liste d'ingrédients, on complétera sa fiche dans le module
 *     recettes.
 *
 * Un champ plutôt que deux — un pour chercher, un pour écrire — parce que la
 * frontière entre les deux ne se décide qu'après avoir tapé : on ne sait pas
 * toujours en commençant si « poulet basquaise » est déjà au répertoire.
 */
export function MealSheet({
  date,
  creneau,
  repas,
  intitule,
  recipes,
  recettesDisponibles,
  onChoisir,
  onCreerRecette,
  onVider,
  onClose,
}) {
  const [saisie, setSaisie] = useState('');
  const [creation, setCreation] = useState(false);
  const champ = useRef(null);

  useEffect(() => {
    champ.current?.focus();
  }, []);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  const texte = saisie.trim();
  const terme = texte.toLocaleLowerCase('fr');
  const visibles = terme
    ? recipes.filter((recette) => recette.title.toLocaleLowerCase('fr').includes(terme))
    : recipes;

  // Une recette porte déjà exactement ce nom : proposer de la créer ferait
  // doublon, et le serveur la retrouverait de toute façon.
  const dejaAuRepertoire = recipes.some((recette) => recette.title.toLocaleLowerCase('fr') === terme);

  const libelleCreneau = CRENEAUX.find((c) => c.valeur === creneau)?.libelle ?? creneau;

  function poserTexteLibre(evenement) {
    evenement.preventDefault();
    if (texte === '') return;

    onChoisir({ title: texte });
    onClose();
  }

  async function creerRecette() {
    setCreation(true);
    await onCreerRecette(texte);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Repas du ${libelleJour(date)}, ${libelleCreneau}`}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900 first-letter:uppercase">
          {libelleJour(date)} — {libelleCreneau}
        </h2>
        {intitule && <p className="mt-0.5 text-sm text-sand-500">Actuellement : {intitule}</p>}

        <form onSubmit={poserTexteLibre} className="mt-4">
          <label htmlFor="menus-saisie" className="text-sm font-medium text-sand-700">
            Ce qui est prévu
          </label>
          <input
            id="menus-saisie"
            ref={champ}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder={recettesDisponibles ? 'Chercher, ou écrire…' : 'Restes, resto…'}
            maxLength={120}
            className="mt-1.5 min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          {texte !== '' && (
            <div className="mt-2 flex gap-2">
              <Button type="submit" variant="secondary" className="flex-1">
                Poser tel quel
              </Button>
              {recettesDisponibles && !dejaAuRepertoire && (
                <Button type="button" onClick={creerRecette} loading={creation} className="flex-1">
                  En faire une recette
                </Button>
              )}
            </div>
          )}
        </form>

        {recettesDisponibles && (
          <div className="mt-6">
            <p className="text-sm font-medium text-sand-700">Mes recettes</p>

            {visibles.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-sand-500">
                {recipes.length === 0
                  ? 'Aucune recette pour le moment.'
                  : 'Aucune recette ne correspond.'}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {visibles.map((recette) => {
                  const posee = repas?.recipeId === recette.id;
                  return (
                    <li key={recette.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChoisir({ recipeId: recette.id, title: recette.title });
                          onClose();
                        }}
                        aria-pressed={posee}
                        className={[
                          'flex min-h-14 w-full items-center gap-2 rounded-xl px-4 text-left ring-1 transition',
                          posee
                            ? 'bg-brand-50 ring-brand-300 active:bg-brand-100'
                            : 'bg-surface ring-sand-200 active:bg-sand-50',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'min-w-0 flex-1 break-words',
                            posee ? 'text-accent' : 'text-sand-900',
                          ].join(' ')}
                        >
                          {recette.title}
                        </span>
                        {recette.servings && (
                          <span className="shrink-0 text-sm text-sand-500">
                            {recette.servings} parts
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

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
              className="flex-1 text-danger"
            >
              Vider la case
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
