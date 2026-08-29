import { useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { menusApi } from '../api.js';
import { analyserMenus } from '../importation.js';
import { CRENEAUX, libelleJour } from '../semaine.js';

const EXEMPLE = `Lundi
Midi : Salade de lentilles
  - Lentilles vertes : 250 g
  - Échalote : 1
Soir : Restes

Mardi
Soir : Gratin de courgettes`;

/**
 * Import d'une semaine écrite en texte.
 *
 * L'analyse se fait à la frappe et le résultat est montré **tel qu'il sera
 * posé**, jour par jour : un format libre ne vaut que si l'on voit ce qu'il a
 * compris avant de valider, sans quoi on découvrirait la semaine de travers
 * une fois appliquée.
 */
export function ImportSheet({ debut, onImporte, onClose }) {
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
      const data = await menusApi.importer(
        repas.map(({ onDate, slot, title, ingredients }) => ({ onDate, slot, title, ingredients })),
      );
      setBilan(data.bilan);
      onImporte();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnvoi(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importer une semaine de menus"
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">Importer une semaine</h2>

        {bilan ? (
          <div className="py-6">
            <p className="text-center font-medium text-sand-900">
              {bilan.posees} repas posés
            </p>
            <ul className="mx-auto mt-3 max-w-sm space-y-1 text-sm text-sand-500">
              {bilan.recettesCreees.length > 0 && (
                <li>{bilan.recettesCreees.length} recette(s) créée(s) : {bilan.recettesCreees.join(', ')}</li>
              )}
              {bilan.recettesMisesAJour.length > 0 && (
                <li>{bilan.recettesMisesAJour.length} recette(s) mise(s) à jour : {bilan.recettesMisesAJour.join(', ')}</li>
              )}
              {bilan.texteLibre.length > 0 && (
                <li>Posés en texte libre : {bilan.texteLibre.join(', ')}</li>
              )}
            </ul>
            <Button type="button" onClick={onClose} className="mt-5 w-full">
              Fermer
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-sand-500">
              Colle la semaine proposée. Un plat dont les ingrédients sont listés devient une
              recette&nbsp;; sinon, une recette du même nom est réutilisée si elle existe.
            </p>

            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder={EXEMPLE}
              aria-label="Semaine à importer"
              rows={8}
              className="mt-3 w-full rounded-xl bg-surface px-4 py-3 font-mono text-sm leading-relaxed ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
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
                  Ce qui sera posé ({repas.length} repas)
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
                              {' '}({r.ingredients.length} ingrédient{r.ingredients.length > 1 ? 's' : ''})
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
                Annuler
              </Button>
              <Button
                type="button"
                onClick={appliquer}
                loading={envoi}
                disabled={repas.length === 0}
                className="flex-1"
              >
                Poser {repas.length > 0 ? `${repas.length} repas` : ''}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
