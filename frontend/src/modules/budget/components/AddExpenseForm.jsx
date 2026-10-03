import { useRef, useState } from 'react';

import { PlusIcon } from '../../../components/icons.jsx';
import { aujourdhui } from '../../../lib/dates.js';
import { analyserMontant } from '../montants.js';
import { T } from '../textes.js';

/**
 * Saisie rapide, ancrée en bas de l'écran.
 *
 * Deux champs seulement — le montant et ce que c'était. La date vaut
 * aujourd'hui, la catégorie et la personne restent à préciser plus tard en
 * touchant la ligne : noter une dépense doit tenir en trois secondes, au
 * moment où l'on range le ticket, pas demander un formulaire.
 *
 * `inputMode="decimal"` sort le pavé numérique du téléphone, virgule comprise.
 */
export function AddExpenseForm({ onAdd, moisAffiche, moisCourant }) {
  const [montant, setMontant] = useState('');
  const [libelle, setLibelle] = useState('');
  const champMontant = useRef(null);

  const centimes = analyserMontant(montant);
  const valide = centimes !== null && centimes > 0 && libelle.trim() !== '';

  async function envoyer(evenement) {
    evenement.preventDefault();
    if (!valide) return;

    const saisie = { montant, libelle };
    setMontant('');
    setLibelle('');
    champMontant.current?.focus();

    try {
      await onAdd({
        label: saisie.libelle.trim(),
        amountCents: centimes,
        // Une dépense saisie en consultant un mois passé s'y range : c'est
        // qu'on rattrape un oubli, pas qu'on dépense aujourd'hui.
        spentOn: moisCourant ? aujourdhui() : moisAffiche,
      });
    } catch {
      // Le serveur a refusé : on rend sa saisie plutôt que de la perdre.
      setMontant(saisie.montant);
      setLibelle(saisie.libelle);
    }
  }

  return (
    <div className="bottom-onglets fixed inset-x-0 z-20 border-t border-sand-200 bg-fond/95 px-4 py-3 backdrop-blur">
      <form onSubmit={envoyer} className="mx-auto flex max-w-2xl items-center gap-2">
        <input
          ref={champMontant}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder={T.saisie.montantExemple}
          aria-label={T.saisie.montant}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          className="min-h-12 w-24 shrink-0 rounded-xl bg-surface px-3 text-right tabular-nums ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
        />
        <input
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder={T.saisie.libelleExemple}
          aria-label={T.saisie.ceQueCEtait}
          enterKeyHint="done"
          autoCapitalize="sentences"
          autoComplete="off"
          className="min-h-12 min-w-0 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={!valide}
          aria-label={T.saisie.ajouter}
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:bg-sand-300"
        >
          <PlusIcon className="size-6" />
        </button>
      </form>
    </div>
  );
}
