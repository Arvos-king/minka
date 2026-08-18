import { useEffect, useRef, useState } from 'react';

import { TrashIcon } from '../../../components/icons.jsx';
import { Button } from '../../../components/ui/Button.jsx';

/** Une ligne vide de plus, pour enchaîner la saisie sans y penser. */
const ligneVide = () => ({ cle: crypto.randomUUID(), name: '', quantity: '' });

/**
 * Création ou modification d'une recette, avec ses ingrédients.
 *
 * Les quantités sont saisies en texte libre : « 200 g », « 2 gousses », « un
 * filet ». Imposer un nombre et une unité alourdirait la saisie sans rien
 * apporter — personne n'additionne deux cuillères à soupe.
 */
export function RecipeForm({ recette, onSave, onDelete, onClose }) {
  const enEdition = Boolean(recette?.id);

  const [title, setTitle] = useState(recette?.title ?? '');
  const [servings, setServings] = useState(recette?.servings ? String(recette.servings) : '');
  const [notes, setNotes] = useState(recette?.notes ?? '');
  const [ingredients, setIngredients] = useState(() =>
    recette?.ingredients?.length
      ? recette.ingredients.map((i) => ({
          cle: crypto.randomUUID(),
          name: i.name,
          quantity: i.quantity ?? '',
        }))
      : [ligneVide()],
  );

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const champTitre = useRef(null);

  useEffect(() => {
    champTitre.current?.focus();
  }, []);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  function modifierLigne(cle, champ, valeur) {
    setIngredients((precedents) =>
      precedents.map((ligne) => (ligne.cle === cle ? { ...ligne, [champ]: valeur } : ligne)),
    );
  }

  async function soumettre(evenement) {
    evenement.preventDefault();
    setErreur(null);
    setEnregistrement(true);

    try {
      await onSave({
        ...(enEdition ? { id: recette.id } : {}),
        title: title.trim(),
        servings: servings === '' ? null : Number(servings),
        notes: notes.trim() || null,
        // Les lignes restées vides ne partent pas : on en laisse toujours une
        // à disposition, elle ne doit pas devenir un ingrédient sans nom.
        ingredients: ingredients
          .filter((ligne) => ligne.name.trim() !== '')
          .map((ligne) => ({ name: ligne.name.trim(), quantity: ligne.quantity.trim() || null })),
      });
      onClose();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnregistrement(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fermer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={enEdition ? 'Modifier la recette' : 'Nouvelle recette'}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">
          {enEdition ? 'Modifier la recette' : 'Nouvelle recette'}
        </h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <input
            ref={champTitre}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nom de la recette"
            aria-label="Nom de la recette"
            required
            maxLength={120}
            className="min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <span className="text-sm font-medium text-sand-700">
              Pour combien&nbsp;?
              <span className="ml-1 font-normal text-sand-500">(facultatif)</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="4"
              aria-label="Nombre de parts"
              className="min-h-10 w-20 rounded-lg bg-sand-50 px-3 text-center text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">Ingrédients</p>
            <ul className="space-y-2">
              {ingredients.map((ligne) => (
                <li key={ligne.cle} className="flex gap-2">
                  <input
                    value={ligne.name}
                    onChange={(e) => modifierLigne(ligne.cle, 'name', e.target.value)}
                    placeholder="Courgettes"
                    aria-label="Nom de l'ingrédient"
                    maxLength={120}
                    className="min-h-12 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    value={ligne.quantity}
                    onChange={(e) => modifierLigne(ligne.cle, 'quantity', e.target.value)}
                    placeholder="200 g"
                    aria-label="Quantité (texte libre)"
                    maxLength={60}
                    className="min-h-12 w-24 rounded-xl bg-surface px-3 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setIngredients((precedents) => {
                        const restants = precedents.filter((l) => l.cle !== ligne.cle);
                        // Jamais zéro ligne : sinon il faudrait un bouton pour
                        // en réclamer une avant de pouvoir saisir.
                        return restants.length > 0 ? restants : [ligneVide()];
                      })
                    }
                    aria-label={`Retirer ${ligne.name || 'cet ingrédient'}`}
                    className="grid size-12 shrink-0 place-items-center rounded-xl text-sand-400 active:bg-sand-200"
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIngredients((precedents) => [...precedents, ligneVide()])}
              className="mt-2"
            >
              Ajouter un ingrédient
            </Button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Préparation (facultative)"
            aria-label="Préparation"
            rows={4}
            maxLength={4000}
            className="w-full rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
          />

          {erreur && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              {erreur}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" loading={enregistrement} className="flex-1">
              Enregistrer
            </Button>
          </div>

          {enEdition &&
            (confirmationSuppression ? (
              <div className="rounded-xl bg-red-50 px-4 py-3">
                {/* Le nombre de repas concernés est annoncé : ils partiront
                    avec la recette. */}
                <p className="text-sm text-danger">
                  Supprimer «&nbsp;{recette.title}&nbsp;»&nbsp;? Elle disparaîtra aussi des repas
                  déjà prévus.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      onDelete(recette.id);
                      onClose();
                    }}
                  >
                    Supprimer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmationSuppression(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmationSuppression(true)}
                className="w-full text-danger"
              >
                Supprimer la recette
              </Button>
            ))}
        </form>
      </div>
    </div>
  );
}
