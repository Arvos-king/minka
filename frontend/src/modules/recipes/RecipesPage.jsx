import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { PlusIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { T as SOCLE } from '../../textes.js';
import { recipesApi } from './api.js';
import { CookingMode } from './components/CookingMode.jsx';
import { ImportSheet } from './components/ImportSheet.jsx';
import { RecipeForm } from './components/RecipeForm.jsx';
import { RecipeSheet } from './components/RecipeSheet.jsx';
import { chercherRecettes, etiquettesDe } from './recherche.js';
import { RecipesIcon } from './RecipesIcon.jsx';
import { T } from './textes.js';
import { useRecipes } from './useRecipes.js';

/** « 4 parts · 6 ingrédients » — assez pour choisir sans ouvrir la fiche. */
function resume({ servings, ingredients }) {
  const morceaux = [];
  if (servings) morceaux.push(T.resume.parts(servings));
  if (ingredients.length > 0) morceaux.push(T.resume.ingredients(ingredients.length));
  return morceaux.join(' · ');
}

export function RecipesPage() {
  const { recettes, status, error, dismissError, signalerErreur, enregistrer, supprimer } =
    useRecipes();
  const location = useLocation();
  const navigate = useNavigate();
  const [parametres, setParametres] = useSearchParams();

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

  /*
   * Vrai quand la fiche affichée est arrivée par un lien d'une autre page de
   * l'application — la casserole d'un repas, dans les menus. La refermer doit
   * alors y ramener : on était venu lire cette recette-là, pas parcourir le
   * répertoire.
   */
  const retourApresFiche = useRef(false);

  /** Le répertoire ne porte pas les quantités ni les étapes : il faut la recette entière. */
  async function ouvrir(id, { depuisUnLien = false } = {}) {
    // On ouvre toujours sur la fiche : une recette relue après un
    // enregistrement ne doit pas renvoyer en pleine cuisine.
    setCuisine(false);
    setOuverture(id);
    try {
      setFiche((await recipesApi.get(id)).recipe);
    } catch (apiError) {
      // Recette disparue entre-temps : on referme, sans rien annoncer. La
      // liste se rechargera au retour sur l'application.
      setFiche(null);
      retourApresFiche.current = false;
      // Sauf si l'on a été envoyé ici pour elle : un répertoire affiché sans
      // un mot laisserait croire que le lien ne mène nulle part.
      if (depuisUnLien) signalerErreur(apiError.message);
    } finally {
      setOuverture(null);
    }
  }

  /*
   * L'adresse publique d'une fiche : `/recettes?recette=12`. C'est par elle que
   * le planning des menus ouvre la recette d'un repas, sans rien importer de ce
   * module.
   *
   * Le paramètre est retiré aussitôt lu : c'est une consigne, pas un état.
   * Resté dans l'adresse, il rouvrirait au rechargement une fiche qu'on vient
   * de fermer.
   */
  const recetteDemandee = parametres.get('recette');

  useEffect(() => {
    if (recetteDemandee === null) return;

    const restants = new URLSearchParams(parametres);
    restants.delete('recette');
    setParametres(restants, { replace: true });

    const id = Number(recetteDemandee);
    if (!Number.isInteger(id) || id <= 0) return;

    // React Router donne la clé « default » à l'entrée qui a ouvert la
    // session : toute autre dit qu'on arrive d'une page de l'application, et
    // qu'il y a donc un endroit où revenir.
    retourApresFiche.current = location.key !== 'default';
    ouvrir(id, { depuisUnLien: true });
    // La demande seule déclenche l'ouverture, et non chaque rendu : `ouvrir`
    // change d'identité à chacun.
  }, [recetteDemandee]);

  /** Referme la fiche — et ramène à la page qui l'avait ouverte, s'il y en a une. */
  function fermerFiche() {
    setFiche(null);
    if (retourApresFiche.current) {
      retourApresFiche.current = false;
      navigate(-1);
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
            {SOCLE.commun.fermer}
          </button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">{SOCLE.chargement}</p>}

      {status === 'ready' && !vide && (
        <>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="search"
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              placeholder={T.chercher.placeholder}
              aria-label={T.chercher.label}
              className="min-h-12 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
            />
            <button
              type="button"
              onClick={() => setImportOuvert(true)}
              className="min-h-11 shrink-0 px-2 text-sm font-medium text-accent"
            >
              {T.importer}
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
                          ? 'bg-brand-600 text-sur-marque'
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
            <p className="mt-6 rounded-2xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-6 py-10 text-center text-sm text-sand-500">
              {T.aucuneCorrespondance}
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
        <div className="mt-6 rounded-2xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-6 py-10 text-center">
          <RecipesIcon className="mx-auto size-8 text-brand-500" />
          <p className="mt-3 text-sm font-medium text-sand-700">{T.aucuneRecette}</p>
          <p className="mt-1 text-sm text-sand-500">{T.aideVide}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => setEnEdition({})}>
              {T.ecrire}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setImportOuvert(true)}>
              {T.coller}
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setEnEdition({})}
        aria-label={T.nouvelle}
        className="bottom-onglets fixed right-4 z-20 mb-4 grid size-14 place-items-center rounded-full bg-brand-600 text-sur-marque shadow-lg transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <PlusIcon className="size-7" />
      </button>

      {fiche && !enEdition && !cuisine && (
        <RecipeSheet
          recette={fiche}
          onCuisiner={() => setCuisine(true)}
          onModifier={() => setEnEdition(fiche)}
          onClose={fermerFiche}
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
