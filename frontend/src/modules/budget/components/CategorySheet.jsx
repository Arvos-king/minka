import { useEffect, useState } from 'react';

import { TrashIcon } from '../../../components/icons.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { T as SOCLE } from '../../../textes.js';
import { analyserMontant, formaterMontantCourt, separateurDecimal } from '../montants.js';
import { T } from '../textes.js';

/**
 * Gestion des catégories, glissée depuis le bas.
 *
 * Le plafond mensuel est facultatif : on veut souvent savoir ce qu'on met dans
 * les restaurants sans se fixer de limite. Sans plafond, la catégorie compte
 * ses dépenses et n'affiche pas de jauge.
 */
export function CategorySheet({ categories, depensesParCategorie, onSave, onDelete, onClose }) {
  const [nouveauLibelle, setNouveauLibelle] = useState('');
  const [nouveauPlafond, setNouveauPlafond] = useState('');
  const [enEdition, setEnEdition] = useState(null); // id de la catégorie modifiée
  const [libelle, setLibelle] = useState('');
  const [plafond, setPlafond] = useState('');
  const [aSupprimer, setASupprimer] = useState(null);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  /** Un plafond vide vaut « pas d'objectif », pas zéro. */
  const lirePlafond = (texte) => (texte.trim() === '' ? null : analyserMontant(texte));

  async function enregistrer(categorie, libelleVoulu, plafondVoulu) {
    const nom = libelleVoulu.trim();
    if (nom === '') return;

    const centimes = lirePlafond(plafondVoulu);
    if (plafondVoulu.trim() !== '' && centimes === null) {
      setErreur(T.categories.plafondIllisible);
      return;
    }

    setErreur(null);
    try {
      await onSave({ ...(categorie ? { id: categorie.id } : {}), label: nom, monthlyBudgetCents: centimes });
      setEnEdition(null);
      setNouveauLibelle('');
      setNouveauPlafond('');
    } catch (apiError) {
      setErreur(apiError.message);
    }
  }

  function ouvrirEdition(categorie) {
    setEnEdition(categorie.id);
    setLibelle(categorie.label);
    setPlafond(
      categorie.monthlyBudgetCents === null
        ? ''
        : String(categorie.monthlyBudgetCents / 100).replace('.', separateurDecimal()),
    );
    setErreur(null);
  }

  const champ = 'min-h-11 rounded-lg bg-surface px-3 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-600';

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
        aria-label={T.categories.gerer}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="text-lg font-semibold text-sand-900">{T.categories.titre}</h2>
        <p className="mt-1 text-sm text-sand-500">{T.categories.intro}</p>

        <ul className="mt-4 space-y-2">
          {categories.map((categorie) => {
            const depense = depensesParCategorie.get(categorie.id) ?? 0;

            if (enEdition === categorie.id) {
              return (
                <li key={categorie.id} className="rounded-xl bg-surface p-3 ring-1 ring-brand-300">
                  <div className="flex gap-2">
                    <input
                      value={libelle}
                      onChange={(e) => setLibelle(e.target.value)}
                      aria-label={T.categories.nom}
                      maxLength={120}
                      className={`${champ} min-w-0 flex-1`}
                    />
                    <input
                      value={plafond}
                      onChange={(e) => setPlafond(e.target.value)}
                      placeholder={T.categories.plafond}
                      aria-label={T.categories.plafondMensuel}
                      inputMode="decimal"
                      className={`${champ} w-24 text-right tabular-nums`}
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => enregistrer(categorie, libelle, plafond)}>
                      {SOCLE.commun.enregistrer}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEnEdition(null)}>
                      {SOCLE.commun.annuler}
                    </Button>
                  </div>
                </li>
              );
            }

            return (
              <li key={categorie.id} className="flex items-center rounded-xl bg-surface ring-1 ring-sand-200">
                <button
                  type="button"
                  onClick={() => ouvrirEdition(categorie)}
                  className="min-h-12 flex-1 rounded-l-xl px-3 text-left active:bg-sand-50"
                >
                  <span className="block text-sand-900">{categorie.label}</span>
                  <span className="block text-xs text-sand-500">
                    {T.categories.ceMoisCi(formaterMontantCourt(depense))}
                    {categorie.monthlyBudgetCents !== null &&
                      T.categories.plafondDe(formaterMontantCourt(categorie.monthlyBudgetCents))}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setASupprimer(categorie)}
                  aria-label={T.categories.supprimerNommee(categorie.label)}
                  className="grid min-h-12 w-12 shrink-0 place-items-center rounded-r-xl text-sand-400 active:bg-sand-100"
                >
                  <TrashIcon className="size-5" />
                </button>
              </li>
            );
          })}
        </ul>

        {aSupprimer && (
          <div role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3">
            <p className="text-sm text-danger">{T.categories.confirmerSuppression(aSupprimer.label)}</p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  onDelete(aSupprimer.id);
                  setASupprimer(null);
                }}
              >
                {SOCLE.commun.supprimer}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setASupprimer(null)}>
                {SOCLE.commun.annuler}
              </Button>
            </div>
          </div>
        )}

        <form
          onSubmit={(evenement) => {
            evenement.preventDefault();
            enregistrer(null, nouveauLibelle, nouveauPlafond);
          }}
          className="mt-4 border-t border-sand-200 pt-4"
        >
          <p className="mb-2 text-sm font-medium text-sand-700">{T.categories.nouvelle}</p>
          <div className="flex gap-2">
            <input
              value={nouveauLibelle}
              onChange={(e) => setNouveauLibelle(e.target.value)}
              placeholder={T.categories.exemple}
              aria-label={T.categories.nomNouvelle}
              maxLength={120}
              className={`${champ} min-w-0 flex-1`}
            />
            <input
              value={nouveauPlafond}
              onChange={(e) => setNouveauPlafond(e.target.value)}
              placeholder={T.categories.plafond}
              aria-label={T.categories.plafondMensuel}
              inputMode="decimal"
              className={`${champ} w-24 text-right tabular-nums`}
            />
            <Button type="submit" size="sm" disabled={nouveauLibelle.trim() === ''}>
              {SOCLE.commun.ajouter}
            </Button>
          </div>
        </form>

        {erreur && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            {erreur}
          </p>
        )}

        <div className="py-4">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full">
            {SOCLE.commun.fermer}
          </Button>
        </div>
      </div>
    </div>
  );
}
