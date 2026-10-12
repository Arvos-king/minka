import { useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { menusApi } from '../api.js';
import { analyserMenus } from '../importation.js';
import { CRENEAUX, libelleJour } from '../semaine.js';
import { T } from '../textes.js';

/**
 * Import d'une semaine écrite en texte.
 *
 * L'analyse se fait à la frappe et le résultat est montré **tel qu'il sera
 * posé**, jour par jour : un format libre ne vaut que si l'on voit ce qu'il a
 * compris avant de valider, sans quoi on découvrirait la semaine de travers
 * une fois appliquée.
 *
 * L'application se fait en **deux requêtes, deux transactions** : les plats
 * partent d'abord au module recettes, qui les retrouve ou les crée et rend
 * leurs identifiants ; le planning se pose ensuite, d'un bloc. L'ordre compte —
 * si la première échoue, le planning n'a pas encore bougé, et l'on sait
 * exactement où l'on en est.
 *
 * Sans le module recettes, la semaine entière se pose en texte libre : les
 * ingrédients lus sont perdus, mais le menu, lui, est là.
 */
export function ImportSheet({ debut, recettesDisponibles, onImporte, onClose }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [bilan, setBilan] = useState(null);

  const { repas, avertissements } = useMemo(() => analyserMenus(texte, debut), [texte, debut]);

  /** Regroupé par jour, dans l'ordre de la semaine, pour l'aperçu. */
  const parJour = useMemo(() => {
    const jours = new Map();
    for (const r of repas) {
      if (!jours.has(r.onDate)) jours.set(r.onDate, []);
      jours.get(r.onDate).push(r);
    }
    return [...jours.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [repas]);

  async function appliquer() {
    setErreur(null);
    setEnvoi(true);

    try {
      // Sans module recettes, tout reste au titre lu : `recipeId` nul, et la
      // case devient un texte libre.
      let resolus = repas.map(({ title }) => ({ title, recipeId: null }));
      let recettes = null;

      if (recettesDisponibles) {
        // Les plats reviennent dans l'ordre envoyé : c'est le contrat de la
        // route, et c'est ce qui permet de les recoudre par position.
        const reponse = await menusApi.resoudreRecettes(
          repas.map(({ title, ingredients }) => ({ title, ingredients })),
        );
        resolus = reponse.plats;
        recettes = reponse.bilan;
      }

      const { bilan: pose } = await menusApi.importer(
        repas.map(({ onDate, slot }, rang) => ({
          onDate,
          slot,
          recipeId: resolus[rang].recipeId,
          title: resolus[rang].title,
        })),
      );

      setBilan({ ...pose, recettes });
      onImporte();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
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
        aria-label={T.importation.dialogue}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">{T.importation.titre}</h2>

        {bilan ? (
          <div className="py-6">
            <p className="text-center font-medium text-sand-900">{T.importation.poses(bilan.posees)}</p>
            <ul className="mx-auto mt-3 max-w-sm space-y-1 text-sm text-sand-500">
              {bilan.recettes?.creees.length > 0 && (
                <li>
                  {T.importation.creees(bilan.recettes.creees.length, bilan.recettes.creees.join(', '))}
                </li>
              )}
              {bilan.recettes?.completees.length > 0 && (
                <li>
                  {T.importation.completees(
                    bilan.recettes.completees.length,
                    bilan.recettes.completees.join(', '),
                  )}
                </li>
              )}
              {/* La recette du foyer fait foi : une liste collée ne réécrit pas
                  une recette qui a déjà sa préparation. Le dire, sans quoi on
                  croirait ses nouveaux ingrédients partis dans les courses. */}
              {bilan.recettes?.conservees.length > 0 && (
                <li>{T.importation.conservees(bilan.recettes.conservees.join(', '))}</li>
              )}
              {bilan.recettes?.inconnues.length > 0 && (
                <li>{T.importation.libres(bilan.recettes.inconnues.join(', '))}</li>
              )}
            </ul>
            <Button type="button" onClick={onClose} className="mt-5 w-full">
              {SOCLE.commun.fermer}
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-sand-500">
              {recettesDisponibles ? T.importation.aideAvecRecettes : T.importation.aideSansRecettes}
            </p>

            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder={T.importation.exemple}
              aria-label={T.importation.champ}
              rows={8}
              className="mt-3 w-full rounded-xl bg-surface px-4 py-3 font-mono text-sm leading-relaxed ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
            />

            {avertissements.length > 0 && (
              <ul role="status" className="mt-3 space-y-1 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
                {avertissements.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}

            {parJour.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-sand-700">
                  {T.importation.apercu(repas.length)}
                </p>
                <ul className="space-y-2">
                  {parJour.map(([date, duJour]) => (
                    <li key={date} className="rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-200">
                      <p className="text-sm font-semibold text-sand-800 first-letter:uppercase">
                        {libelleJour(date)}
                      </p>
                      {duJour.map((r) => (
                        <p key={r.slot} className="mt-1 text-sm text-sand-600">
                          <span className="text-sand-400">
                            {CRENEAUX.find((c) => c.valeur === r.slot)?.libelle}
                            {' — '}
                          </span>
                          {r.title}
                          {r.ingredients.length > 0 && (
                            <span className="text-sand-400">
                              {T.importation.ingredients(r.ingredients.length)}
                            </span>
                          )}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
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
                onClick={appliquer}
                loading={envoi}
                disabled={repas.length === 0}
                className="flex-1"
              >
                {T.importation.poser(repas.length)}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
