import { useRef, useState } from 'react';

import { PlusIcon } from '../../../components/icons.jsx';
import { T as SOCLE } from '../../../textes.js';
import { dansNJours } from '../expiry.js';
import { T } from '../textes.js';

const RACCOURCIS = [
  { libelle: T.formulaire.raccourcis.sansDate, jours: null },
  { libelle: T.formulaire.raccourcis.troisJours, jours: 3 },
  { libelle: T.formulaire.raccourcis.semaine, jours: 7 },
  { libelle: T.formulaire.raccourcis.mois, jours: 30 },
];

/**
 * Ajout d'un produit, ancré en bas de l'écran comme dans la liste de courses.
 *
 * Les raccourcis de date évitent d'ouvrir le sélecteur natif pour les cas
 * courants. La date choisie est conservée après l'envoi : en rangeant les
 * courses, on saisit plusieurs produits d'affilée qui périment le même jour.
 */
export function AddProductForm({ onAdd }) {
  const [name, setName] = useState('');
  const [expiresOn, setExpiresOn] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const valeur = name.trim();
    if (valeur === '') return;

    setName('');
    inputRef.current?.focus();

    try {
      await onAdd({ name: valeur, expiresOn });
    } catch {
      setName(valeur);
    }
  }

  return (
    // `bottom-onglets` : juste au-dessus de la barre de navigation, qui réserve
    // elle-même la marge de gestes du téléphone.
    <div className="bottom-onglets fixed inset-x-0 z-20 border-t border-sand-200 bg-fond/95 px-4 py-3 backdrop-blur">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        {/* Les raccourcis n'apparaissent qu'une fois la saisie commencée : au
            repos, le bandeau reste discret. */}
        {name.trim() !== '' && (
          <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1">
            {RACCOURCIS.map(({ libelle, jours }) => {
              const valeur = jours === null ? null : dansNJours(jours);
              const actif = expiresOn === valeur;
              return (
                <button
                  key={libelle}
                  type="button"
                  onClick={() => setExpiresOn(valeur)}
                  className={[
                    'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    actif ? 'bg-brand-600 text-sur-marque' : 'bg-surface text-sand-600 ring-1 ring-sand-300',
                  ].join(' ')}
                >
                  {libelle}
                </button>
              );
            })}

            <input
              type="date"
              value={expiresOn ?? ''}
              onChange={(event) => setExpiresOn(event.target.value || null)}
              aria-label={T.formulaire.datePrecise}
              className="shrink-0 rounded-full bg-surface px-3 py-1 text-sm text-sand-600 ring-1 ring-sand-300 outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={T.formulaire.placeholder}
            aria-label={T.formulaire.nomAAjouter}
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoComplete="off"
            className="min-h-12 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
          />
          <button
            type="submit"
            disabled={name.trim() === ''}
            aria-label={SOCLE.commun.ajouter}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-sur-marque transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:bg-sand-300"
          >
            <PlusIcon className="size-6" />
          </button>
        </div>
      </form>
    </div>
  );
}
