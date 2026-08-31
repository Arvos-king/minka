import { useMemo, useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { analyserRecette } from '../importation.js';

const EXEMPLE = `Gratin de courgettes
Pour 4 personnes
Étiquettes : végétarien, four

Ingrédients
- 600 g de courgettes
- 20 cl de crème fraîche
- 2 gousses d'ail

Préparation
1. Préchauffer le four à 180 °C
2. Émincer les courgettes
3. Enfourner 35 minutes`;

/**
 * Import d'une recette écrite en texte.
 *
 * L'analyse se fait à la frappe et le résultat est montré **tel qu'il sera
 * enregistré** : un format libre ne vaut que si l'on voit ce qu'il a compris
 * avant de valider. Une quantité mal découpée — « 4 fromages » lu comme quatre
 * fromages — doit se voir ici, pas dans la liste de courses la semaine
 * suivante.
 *
 * Même modèle que l'import d'une semaine de menus, et pour la même raison.
 */
export function ImportSheet({ onImporter, onClose }) {
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const { recette, avertissements } = useMemo(() => analyserRecette(texte), [texte]);

  const complete = recette.title !== '';

  async function appliquer() {
    setErreur(null);
    setEnvoi(true);
    try {
      await onImporter(recette);
      onClose();
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
        aria-label="Importer une recette"
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">Importer une recette</h2>
        <p className="mt-1 text-sm text-sand-500">
          Colle la recette telle que tu l'as trouvée. Le titre en première ligne, les ingrédients à
          la ligne précédés d'un tiret, les étapes numérotées.
        </p>

        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={EXEMPLE}
          aria-label="Recette à importer"
          rows={10}
          className="mt-3 w-full rounded-xl bg-surface px-4 py-3 font-mono text-sm leading-relaxed ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
        />

        {avertissements.length > 0 && (
          <ul role="status" className="mt-3 space-y-1 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
            {avertissements.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}

        {complete && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-sand-700">Ce qui sera enregistré</p>

            <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-200">
              <p className="font-semibold text-sand-900">{recette.title}</p>
              {recette.servings && (
                <p className="text-sm text-sand-500">Pour {recette.servings}</p>
              )}

              {recette.tags.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {recette.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-sand-200 px-2.5 py-1 text-xs text-sand-700"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}

              {recette.ingredients.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {recette.ingredients.map((ingredient, rang) => (
                    // Le rang comme clé : deux ingrédients peuvent porter le
                    // même nom dans un texte mal écrit, et l'aperçu doit le
                    // montrer plutôt que d'en escamoter un.
                    <li key={rang} className="flex items-baseline gap-3 text-sm">
                      <span className="min-w-0 flex-1 break-words text-sand-800">
                        {ingredient.name}
                      </span>
                      {ingredient.quantity && (
                        <span className="shrink-0 text-sand-500">{ingredient.quantity}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {recette.steps.length > 0 && (
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-sand-800 marker:text-sand-400">
                  {recette.steps.map((step, rang) => (
                    <li key={rang} className="break-words">
                      {step.text}
                    </li>
                  ))}
                </ol>
              )}
            </div>
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
            disabled={!complete}
            className="flex-1"
          >
            Créer la recette
          </Button>
        </div>
      </div>
    </div>
  );
}
