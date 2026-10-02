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
 *
 * Sur une case occupée, le repas en place peut aussi partir ailleurs :
 * « Déplacer… » referme le panneau pour laisser choisir la case, « Décaler d'un
 * jour » l'envoie au lendemain en poussant la suite. Après un décalage, le
 * panneau **reste ouvert sur la case vidée**, champ prêt : « ce soir, resto »
 * se dit alors en deux gestes, décaler puis écrire.
 */
export function MealSheet({
  date,
  creneau,
  repas,
  intitule,
  recipes,
  recettesDisponibles,
  annulation,
  onChoisir,
  onCreerRecette,
  onVider,
  onDeplacer,
  onDecaler,
  onAnnuler,
  onClose,
}) {
  const [saisie, setSaisie] = useState('');
  const [creation, setCreation] = useState(false);
  // null, puis 'envoi', puis { resume } une fois le décalage confirmé.
  const [decalage, setDecalage] = useState(null);
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

  // Dans les deux cas, un échec referme le panneau : l'erreur s'affiche en tête
  // de page, que le voile masquerait.
  async function decaler() {
    setDecalage('envoi');
    const resultat = await onDecaler();
    if (!resultat) {
      onClose();
      return;
    }

    setDecalage(resultat);
    champ.current?.focus();
  }

  async function annulerDecalage() {
    if (!(await onAnnuler())) {
      onClose();
      return;
    }

    setDecalage(null);
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

        {decalage ? (
          <div role="status" className="mt-3 flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3">
            <p className="flex-1 text-sm text-sand-800">
              {decalage === 'envoi' ? 'Décalage…' : decalage.resume}
            </p>
            {/* L'annulation n'est offerte que tant qu'elle tient : poser un
                repas dans la case vidée l'efface. */}
            {decalage !== 'envoi' && annulation && (
              <button
                type="button"
                onClick={annulerDecalage}
                aria-label="Annuler le décalage"
                className="shrink-0 text-sm font-medium text-accent underline"
              >
                Annuler
              </button>
            )}
          </div>
        ) : (
          // Un repas pas encore confirmé ne part nulle part : le serveur ne le
          // connaît pas encore sous cette forme.
          repas &&
          !repas.pending && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={onDeplacer} className="flex-1">
                Déplacer…
              </Button>
              <Button size="sm" variant="secondary" onClick={decaler} className="flex-1">
                Décaler d'un jour
              </Button>
            </div>
          )
        )}

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
          {/* Après un décalage, il n'y a plus rien à abandonner : le geste est
              fait. « Annuler » ici laisserait croire qu'il se défait en
              refermant, quand c'est le lien sous l'intitulé qui s'en charge. */}
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {decalage ? 'Fermer' : 'Annuler'}
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
