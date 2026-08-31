import { useMemo, useState } from 'react';

import { PlusIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { recipesApi } from './api.js';
import { CookingMode } from './components/CookingMode.jsx';
import { ImportSheet } from './components/ImportSheet.jsx';
import { RecipeForm } from './components/RecipeForm.jsx';
import { RecipeSheet } from './components/RecipeSheet.jsx';
import { chercherRecettes, etiquettesDe } from './recherche.js';
import { RecipesIcon } from './RecipesIcon.jsx';
import { useRecipes } from './useRecipes.js';

/** « 4 parts · 6 ingrédients » — assez pour choisir sans ouvrir la fiche. */
function resume({ servings, ingredients }) {
  const morceaux = [];
  if (servings) morceaux.push(`${servings} parts`);
  if (ingredients.length > 0) {
    morceaux.push(`${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''}`);
  }
  return morceaux.join(' · ');
}

export function RecipesPage() {
  const { recettes, status, error, dismissError, enregistrer, supprimer } = useRecipes();

  const [fiche, setFiche] = useState(null); // la recette entière, en lecture
  const [enEdition, setEnEdition] = useState(null); // {} = création
  const [cuisine, setCuisine] = useState(false); // le mode cuisine, sur la fiche
  const [importOuvert, setImportOuvert] = useState(false);
  const [ouverture, setOuverture] = useState(null); // id en cours de chargement

  const [terme, setTerme] = useState('');
  const [etiquette, setEtiquette] = useState(null);

  /*
   * Les étiquettes du répertoire entier, et non des seuls résultats : les
   * filtres qui disparaissent à mesure qu'on tape sont impossibles à viser.
   */
  const etiquettes = useMemo(() => etiquettesDe(recettes), [recettes]);
  const resultats = useMemo(
    () => chercherRecettes(recettes, { terme, etiquette }),
    [recettes, terme, etiquette],
  );

  /** Le répertoire ne porte pas les quantités ni les étapes : il faut la recette entière. */
  async function ouvrir(id) {
    // On ouvre toujours sur la fiche : une recette relue après un
    // enregistrement ne doit pas renvoyer en pleine cuisine.
    setCuisine(false);
    setOuverture(id);
    try {
      setFiche((await recipesApi.get(id)).recipe);
    } catch {
      // Recette disparue entre-temps : on referme, sans rien annoncer. La
      // liste se rechargera au retour sur l'application.
      setFiche(null);
    } finally {
      setOuverture(null);
    }
  }

  /**
   * Fermer le formulaire relit la fiche, plutôt que de revenir au répertoire.
   *
   * Une seule ligne, et elle règle trois cas d'un coup : après un
   * enregistrement la fiche montre la version à jour ; après une annulation
   * elle rouvre inchangée ; après une suppression la relecture échoue et tout
   * se referme — y compris si la suppression est refusée, auquel cas la fiche
   * revient avec le message d'erreur.
   */
  function fermerFormulaire() {
    setEnEdition(null);
    if (fiche) ouvrir(fiche.id);
  }

  const vide = recettes.length === 0;

  return (
    <div className="pb-4">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-danger underline">
            Fermer
          </button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">Chargement…</p>}

      {status === 'ready' && !vide && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="search"
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              placeholder="Chercher un plat, un ingrédient…"
              aria-label="Chercher une recette"
              className="min-h-12 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setImportOuvert(true)}
              className="min-h-11 shrink-0 px-2 text-sm font-medium text-accent"
            >
              Importer
            </button>
          </div>

          {etiquettes.length > 0 && (
            // Défilement horizontal plutôt qu'un retour à la ligne : la rangée
            // garde une hauteur fixe, et la liste dessous ne bouge pas quand on
            // change de filtre.
            <ul className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
              {etiquettes.map((tag) => {
                const active = etiquette === tag;
                return (
                  <li key={tag} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setEtiquette(active ? null : tag)}
                      aria-pressed={active}
                      className={[
                        'min-h-9 rounded-full px-3 text-sm transition',
                        active
                          ? 'bg-brand-600 text-white'
                          : // Un anneau, et non un simple aplat : `sand-100`
                            // est exactement la couleur du fond de page, la
                            // puce s'y effacerait.
                            'bg-surface text-sand-600 ring-1 ring-sand-300 active:bg-sand-100',
                      ].join(' ')}
                    >
                      {tag}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {resultats.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-sand-300 px-6 py-10 text-center text-sm text-sand-500">
              Aucune recette ne correspond.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {resultats.map(({ recette, ingredientsTrouves }) => (
                <li key={recette.id}>
                  <button
                    type="button"
                    onClick={() => ouvrir(recette.id)}
                    aria-busy={ouverture === recette.id}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-surface px-4 py-2 text-left ring-1 ring-sand-200 active:bg-sand-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sand-900">{recette.title}</span>
                      {/* Quand c'est un ingrédient qui a répondu, c'est lui
                          qu'on montre : sinon la recette paraît là par erreur. */}
                      {ingredientsTrouves.length > 0 ? (
                        <span className="block truncate text-sm text-accent">
                          {ingredientsTrouves.join(', ')}
                        </span>
                      ) : (
                        resume(recette) && (
                          <span className="block text-sm text-sand-500">{resume(recette)}</span>
                        )
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {status === 'ready' && vide && (
        <div className="mt-6 rounded-2xl border border-dashed border-sand-300 px-6 py-10 text-center">
          <RecipesIcon className="mx-auto size-8 text-sand-400" />
          <p className="mt-3 text-sm font-medium text-sand-700">Aucune recette</p>
          <p className="mt-1 text-sm text-sand-500">
            Note celles qui reviennent : elles se posent ensuite dans les menus d'un tap, leurs
            ingrédients partent dans les courses, et leurs étapes se cochent pendant la cuisine.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => setEnEdition({})}>
              Écrire une recette
            </Button>
            <Button type="button" variant="secondary" onClick={() => setImportOuvert(true)}>
              Coller un texte
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setEnEdition({})}
        aria-label="Nouvelle recette"
        className="bottom-onglets fixed right-4 z-20 mb-4 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <PlusIcon className="size-7" />
      </button>

      {fiche && !enEdition && !cuisine && (
        <RecipeSheet
          recette={fiche}
          onCuisiner={() => setCuisine(true)}
          onModifier={() => setEnEdition(fiche)}
          onClose={() => setFiche(null)}
        />
      )}

      {/* Le mode cuisine se pose par-dessus la fiche, qui reste dessous : le
          quitter y ramène, et non au répertoire. On referme une recette qu'on
          vient de cuisiner, on ne repart pas en chercher une autre. */}
      {fiche && cuisine && <CookingMode recette={fiche} onClose={() => setCuisine(false)} />}

      {enEdition && (
        <RecipeForm
          recette={enEdition.id ? enEdition : null}
          etiquettesConnues={etiquettes}
          onSave={enregistrer}
          onDelete={supprimer}
          onClose={fermerFormulaire}
        />
      )}

      {importOuvert && (
        <ImportSheet
          onImporter={async (recette) => {
            // La recette importée s'ouvre aussitôt : c'est le moment où l'on
            // veut relire ce qui a été compris, la fiche le montre mieux que
            // l'aperçu.
            setFiche(await enregistrer(recette));
          }}
          onClose={() => setImportOuvert(false)}
        />
      )}
    </div>
  );
}
