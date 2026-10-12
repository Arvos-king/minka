import { useEffect, useRef, useState } from 'react';

import { TrashIcon } from '../../../components/icons.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { decouperEtapes, recoudreEtapes } from '../etapes.js';
import { normaliser } from '../recherche.js';
import { T } from '../textes.js';

/** Une ligne vide de plus, pour enchaîner la saisie sans y penser. */
const ligneVide = () => ({ cle: crypto.randomUUID(), name: '', quantity: '' });

/**
 * Création ou modification d'une recette : ses ingrédients, sa préparation.
 *
 * Les quantités sont saisies en texte libre : « 200 g », « 2 gousses », « un
 * filet ». Imposer un nombre et une unité alourdirait la saisie sans rien
 * apporter — personne n'additionne deux cuillères à soupe.
 *
 * La préparation, elle, se tape d'un bloc — **une ligne, une étape** — et
 * ressort en étapes numérotées, cochables pendant la cuisine. Voir
 * `etapes.js` : un champ par étape aurait demandé un mécanisme de
 * réordonnancement pour un geste qui n'a lieu qu'à la rédaction.
 */
export function RecipeForm({ recette, etiquettesConnues = [], onSave, onDelete, onClose }) {
  const enEdition = Boolean(recette?.id);

  const [title, setTitle] = useState(recette?.title ?? '');
  const [servings, setServings] = useState(recette?.servings ? String(recette.servings) : '');
  const [notes, setNotes] = useState(recette?.notes ?? '');
  const [preparation, setPreparation] = useState(() => recoudreEtapes(recette?.steps));
  const [tags, setTags] = useState(() => recette?.tags ?? []);
  const [saisieTag, setSaisieTag] = useState('');
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

  /*
   * Une recette d'avant les étapes : sa préparation est dans les remarques,
   * d'un seul bloc. La proposition ne vaut que là — pas sur une recette qu'on
   * est en train d'écrire, où les remarques sont vraiment des remarques.
   */
  const aConvertir =
    enEdition &&
    recette.steps.length === 0 &&
    notes.trim() !== '' &&
    preparation.trim() === '';

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

  /**
   * Ajoute une étiquette, en écartant les doublons à la casse et aux accents
   * près. Le serveur aligne ensuite l'orthographe sur celle déjà en usage —
   * ici, il s'agit seulement de ne pas la proposer deux fois à l'écran.
   */
  function ajouterTag(valeur) {
    const propre = valeur.trim().replace(/\s+/g, ' ');
    if (propre === '') return;

    setTags((precedents) =>
      precedents.some((tag) => normaliser(tag) === normaliser(propre))
        ? precedents
        : [...precedents, propre],
    );
    setSaisieTag('');
  }

  function surToucheTag(evenement) {
    // La virgule autant que la touche Entrée : on écrit « végétarien, rapide »
    // sans y penser. Entrée est interceptée pour ne pas soumettre le
    // formulaire depuis un champ qui n'en est pas le dernier mot.
    if (evenement.key === 'Enter' || evenement.key === ',') {
      evenement.preventDefault();
      ajouterTag(saisieTag);
    } else if (evenement.key === 'Backspace' && saisieTag === '') {
      setTags((precedents) => precedents.slice(0, -1));
    }
  }

  const cleSaisie = normaliser(saisieTag);
  const suggestions = etiquettesConnues.filter(
    (connue) =>
      !tags.some((tag) => normaliser(tag) === normaliser(connue)) &&
      (cleSaisie === '' || normaliser(connue).includes(cleSaisie)),
  );

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
        steps: decouperEtapes(preparation),
        // Ce qui reste dans le champ compte : une étiquette tapée sans avoir
        // appuyé sur Entrée serait sinon perdue sans un mot.
        tags: saisieTag.trim() === '' ? tags : [...tags, saisieTag.trim()],
      });
      onClose();
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
      setEnregistrement(false);
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
        aria-label={enEdition ? T.formulaire.modifier : T.formulaire.nouvelle}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="font-titre text-xl font-medium text-sand-900">
          {enEdition ? T.formulaire.modifier : T.formulaire.nouvelle}
        </h2>

        <form onSubmit={soumettre} className="mt-4 space-y-4 pb-4">
          <input
            ref={champTitre}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={T.formulaire.nom}
            aria-label={T.formulaire.nom}
            required
            maxLength={120}
            className="min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
          />

          <label className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3 ring-1 ring-sand-200">
            <span className="text-sm font-medium text-sand-700">
              {T.formulaire.pourCombien}
              <span className="ml-1 font-normal text-sand-500">{T.formulaire.facultatif}</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="4"
              aria-label={T.formulaire.nombreDeParts}
              className="min-h-10 w-20 rounded-lg bg-sand-50 px-3 text-center text-sand-800 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-600"
            />
          </label>

          {/* Étiquettes : du texte libre, sans nomenclature ni écran de
              gestion. Les suggestions viennent de ce que le foyer emploie
              déjà — c'est ce qui garde le vocabulaire cohérent sans jamais
              l'imposer. */}
          <div>
            <label htmlFor="recette-etiquette" className="text-sm font-medium text-sand-700">
              {T.formulaire.etiquettes}
              <span className="ml-1 font-normal text-sand-500">{T.formulaire.facultatif}</span>
            </label>

            {tags.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      onClick={() => setTags((precedents) => precedents.filter((t) => t !== tag))}
                      aria-label={T.formulaire.retirerEtiquette(tag)}
                      className="flex min-h-9 items-center gap-1.5 rounded-full bg-brand-100 pr-2.5 pl-3 text-sm text-accent ring-1 ring-brand-300"
                    >
                      {tag}
                      <span aria-hidden="true" className="text-base leading-none">
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input
              id="recette-etiquette"
              value={saisieTag}
              onChange={(e) => setSaisieTag(e.target.value)}
              onKeyDown={surToucheTag}
              placeholder={T.formulaire.etiquettesExemple}
              maxLength={30}
              className="mt-1.5 min-h-12 w-full rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
            />

            {suggestions.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((connue) => (
                  <li key={connue}>
                    <button
                      type="button"
                      onClick={() => ajouterTag(connue)}
                      className="min-h-9 rounded-full bg-surface px-3 text-sm text-sand-600 ring-1 ring-sand-300 active:bg-sand-100"
                    >
                      + {connue}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-sand-700">{T.fiche.ingredients}</p>
            <ul className="space-y-2">
              {ingredients.map((ligne) => (
                <li key={ligne.cle} className="flex gap-2">
                  <input
                    value={ligne.name}
                    onChange={(e) => modifierLigne(ligne.cle, 'name', e.target.value)}
                    placeholder={T.formulaire.ingredientExemple}
                    aria-label={T.formulaire.nomIngredient}
                    maxLength={120}
                    className="min-h-12 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
                  />
                  <input
                    value={ligne.quantity}
                    onChange={(e) => modifierLigne(ligne.cle, 'quantity', e.target.value)}
                    placeholder={T.formulaire.quantiteExemple}
                    aria-label={T.formulaire.quantite}
                    maxLength={60}
                    className="min-h-12 w-24 rounded-xl bg-surface px-3 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
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
                    aria-label={T.formulaire.retirerIngredient(ligne.name || T.formulaire.cetIngredient)}
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
              {T.formulaire.ajouterIngredient}
            </Button>
          </div>

          <div>
            <label htmlFor="recette-preparation" className="text-sm font-medium text-sand-700">
              {T.fiche.preparation}
              <span className="ml-1 font-normal text-sand-500">{T.formulaire.uneLigneUneEtape}</span>
            </label>

            {/* Le champ « préparation » d'avant les étapes : un tap le recopie
                ici, et l'on relit avant d'enregistrer. Découper le texte à la
                migration aurait fait d'un paragraphe de trois phrases trois
                étapes, et d'une consigne coupée en deux lignes deux étapes. */}
            {aConvertir && (
              <div className="mt-1.5 rounded-xl bg-amber-100 px-4 py-3">
                <p className="text-sm text-amber-900">{T.formulaire.aConvertir}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPreparation(notes);
                    setNotes('');
                  }}
                  className="mt-2"
                >
                  {T.formulaire.decouper}
                </Button>
              </div>
            )}

            <textarea
              id="recette-preparation"
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
              placeholder={T.formulaire.preparationExemple}
              rows={6}
              className="mt-1.5 w-full rounded-xl bg-surface px-4 py-3 leading-relaxed ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div>
            <label htmlFor="recette-remarques" className="text-sm font-medium text-sand-700">
              {T.fiche.remarques}
              <span className="ml-1 font-normal text-sand-500">{T.formulaire.facultatif}</span>
            </label>
            <textarea
              id="recette-remarques"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={T.formulaire.remarquesExemple}
              rows={3}
              maxLength={4000}
              className="mt-1.5 w-full rounded-xl bg-surface px-4 py-3 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
            />
          </div>

          {erreur && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              {erreur}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              {SOCLE.commun.annuler}
            </Button>
            <Button type="submit" loading={enregistrement} className="flex-1">
              {SOCLE.commun.enregistrer}
            </Button>
          </div>

          {enEdition &&
            (confirmationSuppression ? (
              <div className="rounded-xl bg-red-50 px-4 py-3">
                {/* Les repas déjà prévus ne partent plus avec elle : ils
                    gardent son intitulé et perdent seulement leur fiche.
                    Ranger le répertoire ne doit pas trouer la semaine. */}
                <p className="text-sm text-danger">{T.formulaire.confirmerSuppression(recette.title)}</p>
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
                    {SOCLE.commun.supprimer}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmationSuppression(false)}
                  >
                    {SOCLE.commun.annuler}
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
                {T.formulaire.supprimer}
              </Button>
            ))}
        </form>
      </div>
    </div>
  );
}
