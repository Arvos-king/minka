import { useEffect, useMemo, useRef, useState } from 'react';

import { ChevronRightIcon } from '../../components/icons.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { aujourdhui } from '../../lib/dates.js';
import { useServerModule } from '../../lib/serverModules.js';
import { BandeauAnnulation } from './components/BandeauAnnulation.jsx';
import { BandeauPlacement } from './components/BandeauPlacement.jsx';
import { DayRow } from './components/DayRow.jsx';
import { Fantome } from './components/Fantome.jsx';
import { ImportSheet } from './components/ImportSheet.jsx';
import { MealSheet } from './components/MealSheet.jsx';
import { ShoppingSheet } from './components/ShoppingSheet.jsx';
import { MenusIcon } from './MenusIcon.jsx';
import { PoigneeIcon } from './PoigneeIcon.jsx';
import { contenuDe, decrireDepot } from './reorganisation.js';
import { joursDeLaSemaine, libelleSemaine } from './semaine.js';
import { useGlisser } from './useGlisser.js';
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
    recetteDe,
    intituleDe,
    rafraichir,
    recipes,
    recettesDisponibles,
    status,
    error,
    dismissError,
    definirRepas,
    viderRepas,
    creerEtPoser,
    deplacer,
    decaler,
    annulation,
    annuler,
    oublierAnnulation,
  } = useMenus();

  // Le module courses est-il monté côté API ? Le lien entre les modules se
  // limite à ce test et à un appel HTTP : aucun code partagé.
  const coursesDisponibles = useServerModule('shopping');

  const [saisie, setSaisie] = useState(null); // { date, creneau }
  const [coursesOuvertes, setCoursesOuvertes] = useState(false);
  const [importOuvert, setImportOuvert] = useState(false);

  /*
   * Mode « Déplacer… » : un repas attend sa case. Son contenu voyage avec lui,
   * parce qu'on peut changer de semaine avant de le poser — sa case de départ
   * n'est alors plus à l'écran.
   */
  const [placement, setPlacement] = useState(null); // { de: { date, slot }, contenu, intitule }

  function commencerPlacement(date, creneau) {
    const repas = repasDe(date, creneau);
    if (!repas || repas.pending) return;

    setSaisie(null);
    oublierAnnulation();
    setPlacement({ de: { date, slot: creneau }, contenu: contenuDe(repas), intitule: intituleDe(repas) });
  }

  /** Toucher une case : l'ouvrir, ou y poser le repas qui attend. */
  function toucherCase(date, creneau) {
    if (!placement) {
      setSaisie({ date, creneau });
      return;
    }

    const { de, contenu } = placement;
    setPlacement(null);
    // La case de départ elle-même : le geste est abandonné.
    if (de.date === date && de.slot === creneau) return;
    deplacer(de, { date, slot: creneau }, contenu);
  }

  useEffect(() => {
    if (!placement) return undefined;

    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') setPlacement(null);
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [placement]);

  /*
   * La poignée d'un repas : glissée, elle le dépose ; touchée, elle ouvre le
   * mode « Déplacer… », le même que celui du panneau.
   */
  const { glisse, fantome, poignee } = useGlisser({
    onDeposer: (de, vers) => deplacer(de, vers),
    onToucher: (de) => commencerPlacement(de.date, de.slot),
  });

  const issueDuDepot = glisse?.vers
    ? decrireDepot(glisse.vers, intituleDe(repasDe(glisse.vers.date, glisse.vers.slot)))
    : 'Vers quelle case ?';

  /*
   * Un seul bandeau à la fois au-dessus des onglets. Celui d'annulation attend
   * que les panneaux soient refermés : derrière leur voile, il s'écoulerait
   * sans être vu — le panneau d'une case offre alors sa propre annulation.
   */
  const panneauOuvert = saisie !== null || coursesOuvertes || importOuvert;
  const bandeau = placement ? 'placement' : annulation && !panneauOuvert ? 'annulation' : null;

  const jours = joursDeLaSemaine(debut);
  const ceJour = aujourdhui();
  const semaineCourante = ceJour >= debut && ceJour <= fin;
  const repasPrevus = entries.length;

  /*
   * La page s'ouvre sur aujourd'hui : c'est la question qu'on vient lui poser
   * — qu'y a-t-il à préparer ? —, et du jeudi au dimanche la réponse tombait
   * hors de l'écran.
   *
   * `center` plutôt que `start` : la carte n'a ainsi à connaître ni la hauteur
   * de l'en-tête collant (encoche, bandeau hors ligne) ni celle de la barre
   * d'onglets. En début de semaine, la page ne bouge pas ou à peine — une carte
   * proche du haut ne peut pas être centrée.
   *
   * L'effet suit le chargement et la semaine affichée, pas les repas : le
   * rafraîchissement silencieux du retour sur l'application ne doit pas
   * déplacer la page sous le doigt de qui la fait défiler.
   */
  const carteDuJour = useRef(null);

  useEffect(() => {
    if (status === 'ready' && semaineCourante) {
      carteDuJour.current?.scrollIntoView({ block: 'center' });
    }
  }, [status, debut, semaineCourante]);

  /*
   * Les recettes posées cette semaine, dans l'ordre des jours — c'est ce que
   * le module recettes attend pour regrouper leurs ingrédients.
   *
   * La dépendance est la clé textuelle, pas `entries` : celui-ci change
   * d'identité à chaque rafraîchissement, même quand rien n'a bougé, et le
   * tableau part en dépendance d'un effet dans le panneau des courses — un
   * simple retour sur l'application le relancerait.
   */
  const clePosees = entries
    .filter((entry) => entry.recipeId)
    .map((entry) => entry.recipeId)
    .join(',');

  const recettesDeLaSemaine = useMemo(
    () => (clePosees === '' ? [] : clePosees.split(',').map(Number)),
    [clePosees],
  );

  const envoiPossible = coursesDisponibles && recettesDisponibles;

  return (
    // Un bandeau couvre le bas de l'écran : la marge le compense, pour que le
    // dimanche et le bouton des courses restent atteignables.
    <div className={bandeau ? 'pb-28' : 'pb-4'}>
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
          {/* Pendant un glisser à la souris, le pointeur traverse des intitulés
              qu'il ne doit pas sélectionner au passage. */}
          <ul className={['space-y-3', glisse ? 'select-none' : ''].join(' ')}>
            {jours.map((date) => (
              <li key={date} ref={date === ceJour ? carteDuJour : undefined}>
                <DayRow
                  date={date}
                  estAujourdhui={date === ceJour}
                  repasDe={repasDe}
                  recetteDe={recetteDe}
                  intituleDe={intituleDe}
                  placement={placement}
                  glisse={glisse}
                  poignee={poignee}
                  onOuvrir={toucherCase}
                />
              </li>
            ))}
          </ul>

          {/* Le geste ne se devine pas tout à fait : la poignée se voit, mais
              qu'on puisse aussi la toucher, et ce que devient un repas déjà
              en place, il faut le dire. En bas de la semaine, comme l'aide
              des courses : c'est là qu'on la lit, après l'avoir parcourue. */}
          {repasPrevus > 0 && !placement && (
            <p className="mt-3 text-xs text-sand-500">
              {/* Les marges négatives rattrapent le vide que le dessin laisse de
                  part et d'autre de ses points. */}
              Pour déplacer un repas, fais glisser sa poignée{' '}
              <PoigneeIcon className="-mx-1 inline size-4 align-[-3px]" />, ou touche-la puis choisis
              la case. Sur un repas déjà prévu, il s'insère et pousse la suite d'un jour.
            </p>
          )}

          {/* La boucle du module : ce qui est prévu devient ce qu'il faut
              acheter. Le bouton se place après la semaine, dans l'ordre où l'on
              s'en sert : on planifie, puis on envoie. Il demande les deux
              modules — celui qui tient les ingrédients, et celui qui les
              reçoit. */}
          {envoiPossible && (
            <div className="mt-6">
              <Button
                type="button"
                onClick={() => setCoursesOuvertes(true)}
                disabled={recettesDeLaSemaine.length === 0}
                className="w-full"
              >
                Envoyer les ingrédients dans les courses
              </Button>
              {recettesDeLaSemaine.length === 0 && (
                <p className="mt-2 text-center text-sm text-sand-500">
                  Aucune recette posée cette semaine pour l'instant.
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
          intitule={intituleDe(repasDe(saisie.date, saisie.creneau))}
          recipes={recipes}
          recettesDisponibles={recettesDisponibles}
          annulation={annulation}
          onChoisir={(contenu) => definirRepas(saisie.date, saisie.creneau, contenu)}
          onCreerRecette={(title) => creerEtPoser(saisie.date, saisie.creneau, title)}
          onVider={() => {
            const repas = repasDe(saisie.date, saisie.creneau);
            if (repas) viderRepas(repas);
          }}
          onDeplacer={() => commencerPlacement(saisie.date, saisie.creneau)}
          onDecaler={() => decaler(saisie.date, saisie.creneau)}
          onAnnuler={annuler}
          onClose={() => setSaisie(null)}
        />
      )}

      {bandeau === 'placement' && (
        <BandeauPlacement intitule={placement.intitule} onAnnuler={() => setPlacement(null)} />
      )}

      {bandeau === 'annulation' && (
        <BandeauAnnulation annulation={annulation} onAnnuler={annuler} onFermer={oublierAnnulation} />
      )}

      <Fantome ref={fantome} glisse={glisse} description={issueDuDepot} />

      {coursesOuvertes && (
        <ShoppingSheet
          recipeIds={recettesDeLaSemaine}
          onClose={() => setCoursesOuvertes(false)}
        />
      )}

      {importOuvert && (
        <ImportSheet
          debut={debut}
          recettesDisponibles={recettesDisponibles}
          onImporte={rafraichir}
          onClose={() => setImportOuvert(false)}
        />
      )}
    </div>
  );
}
