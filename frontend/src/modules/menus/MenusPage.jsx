import { useState } from 'react';

import { ChevronRightIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { aujourdhui } from '../../lib/dates.js';
import { useServerModule } from '../../lib/serverModules.js';
import { menusApi } from './api.js';
import { DayRow } from './components/DayRow.jsx';
import { ImportSheet } from './components/ImportSheet.jsx';
import { MealSheet } from './components/MealSheet.jsx';
import { RecipeForm } from './components/RecipeForm.jsx';
import { ShoppingSheet } from './components/ShoppingSheet.jsx';
import { MenusIcon } from './MenusIcon.jsx';
import { joursDeLaSemaine, libelleSemaine } from './semaine.js';
import { useMenus } from './useMenus.js';

export function MenusPage() {
  const {
    debut,
    fin,
    semainePrecedente,
    semaineSuivante,
    revenirALaSemaineCourante,
    entries,
    repasDe,
    rafraichir,
    recipes,
    status,
    error,
    dismissError,
    definirRepas,
    viderRepas,
    enregistrerRecette,
    supprimerRecette,
  } = useMenus();

  // Le module courses est-il monté côté API ? Le lien entre les deux modules se
  // limite à ce test et à un appel HTTP : aucun code partagé.
  const coursesDisponibles = useServerModule('shopping');

  const [saisie, setSaisie] = useState(null); // { date, creneau }
  const [recetteEnEdition, setRecetteEnEdition] = useState(null); // {} = création
  const [coursesOuvertes, setCoursesOuvertes] = useState(false);
  const [importOuvert, setImportOuvert] = useState(false);

  const jours = joursDeLaSemaine(debut);
  const ceJour = aujourdhui();
  const semaineCourante = ceJour >= debut && ceJour <= fin;
  const repasPrevus = entries.length;

  /** Le sélecteur ne connaît pas les ingrédients : il faut la recette entière. */
  async function ouvrirRecette(id) {
    try {
      const { recipe } = await menusApi.recipe(id);
      setSaisie(null);
      setRecetteEnEdition(recipe);
    } catch {
      // Recette disparue entre-temps : le sélecteur se rechargera au retour.
      setSaisie(null);
    }
  }

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

      {/* Navigation entre semaines. Les flèches encadrent le libellé : c'est le
          geste attendu, et les deux cibles restent loin l'une de l'autre. */}
      <div className="mb-4 flex items-center gap-1">
        <button
          type="button"
          onClick={semainePrecedente}
          aria-label="Semaine précédente"
          className="grid size-11 shrink-0 place-items-center rounded-full text-sand-600 active:bg-sand-200"
        >
          <ChevronRightIcon className="size-5 rotate-180" />
        </button>

        <p className="flex-1 text-center font-semibold text-sand-900">{libelleSemaine(debut)}</p>

        <button
          type="button"
          onClick={() => setImportOuvert(true)}
          className="min-h-11 shrink-0 px-2 text-sm font-medium text-accent"
        >
          Importer
        </button>

        <button
          type="button"
          onClick={semaineSuivante}
          aria-label="Semaine suivante"
          className="grid size-11 shrink-0 place-items-center rounded-full text-sand-600 active:bg-sand-200"
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </div>

      {!semaineCourante && (
        <div className="mb-4 text-center">
          <Button size="sm" variant="secondary" onClick={revenirALaSemaineCourante}>
            Revenir à cette semaine
          </Button>
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">Chargement…</p>}

      {status === 'ready' && (
        <>
          <ul className="space-y-3">
            {jours.map((date) => (
              <li key={date}>
                <DayRow
                  date={date}
                  estAujourdhui={date === ceJour}
                  repasDe={repasDe}
                  onOuvrir={(jour, creneau) => setSaisie({ date: jour, creneau })}
                />
              </li>
            ))}
          </ul>

          {/* La boucle du module : ce qui est prévu devient ce qu'il faut
              acheter. Le bouton se place après la semaine, dans l'ordre où l'on
              s'en sert : on planifie, puis on envoie. */}
          {coursesDisponibles && (
            <div className="mt-6">
              <Button
                type="button"
                onClick={() => setCoursesOuvertes(true)}
                disabled={repasPrevus === 0}
                className="w-full"
              >
                Envoyer les ingrédients dans les courses
              </Button>
              {repasPrevus === 0 && (
                <p className="mt-2 text-center text-sm text-sand-500">
                  Rien de prévu cette semaine pour l'instant.
                </p>
              )}
            </div>
          )}

          {repasPrevus === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-sand-300 px-6 py-10 text-center">
              <MenusIcon className="mx-auto size-8 text-sand-400" />
              <p className="mt-3 text-sm font-medium text-sand-700">Semaine vide</p>
              <p className="mt-1 text-sm text-sand-500">
                Touche un midi ou un soir pour y poser un repas.
              </p>
            </div>
          )}
        </>
      )}

      {saisie && (
        <MealSheet
          date={saisie.date}
          creneau={saisie.creneau}
          repas={repasDe(saisie.date, saisie.creneau)}
          recipes={recipes}
          onChoisir={(contenu) => definirRepas(saisie.date, saisie.creneau, contenu)}
          onVider={() => {
            const repas = repasDe(saisie.date, saisie.creneau);
            if (repas) viderRepas(repas);
          }}
          onNouvelleRecette={() => {
            setSaisie(null);
            setRecetteEnEdition({});
          }}
          onModifierRecette={ouvrirRecette}
          onClose={() => setSaisie(null)}
        />
      )}

      {recetteEnEdition && (
        <RecipeForm
          recette={recetteEnEdition.id ? recetteEnEdition : null}
          onSave={enregistrerRecette}
          onDelete={supprimerRecette}
          onClose={() => setRecetteEnEdition(null)}
        />
      )}

      {coursesOuvertes && (
        <ShoppingSheet from={debut} to={fin} onClose={() => setCoursesOuvertes(false)} />
      )}

      {importOuvert && (
        <ImportSheet
          debut={debut}
          onImporte={rafraichir}
          onClose={() => setImportOuvert(false)}
        />
      )}
    </div>
  );
}
