import { useRef, useState } from 'react';

import { PlusIcon } from '../../../components/icons.jsx';

/**
 * Champ d'ajout, ancré en bas de l'écran.
 *
 * Deux partis pris pour l'usage en magasin :
 *   — le champ garde le focus après l'envoi, ce qui laisse le clavier ouvert et
 *     permet d'enchaîner les articles sans revenir le toucher ;
 *   — il n'est jamais désactivé pendant l'envoi : l'ajout étant optimiste, on
 *     peut taper le suivant pendant que le précédent part.
 */
export function AddItemForm({ onAdd }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const value = name.trim();
    if (value === '') return;

    setName('');
    inputRef.current?.focus();

    try {
      await onAdd(value);
    } catch {
      // Le serveur a refusé : on rend sa saisie plutôt que de la perdre.
      setName(value);
    }
  }

  return (
    // `bottom-onglets` : juste au-dessus de la barre de navigation, qui réserve
    // elle-même la marge de gestes du téléphone.
    <div className="bottom-onglets fixed inset-x-0 z-20 border-t border-sand-200 bg-sand-100/95 px-4 py-3 backdrop-blur">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ajouter un article…"
          aria-label="Nom de l'article à ajouter"
          enterKeyHint="done"
          autoCapitalize="sentences"
          autoComplete="off"
          className="min-h-12 flex-1 rounded-xl bg-white px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={name.trim() === ''}
          aria-label="Ajouter"
          className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:bg-sand-300"
        >
          <PlusIcon className="size-6" />
        </button>
      </form>
    </div>
  );
}
