import { useEffect, useState } from 'react';

import { couleurPersonne } from '../lib/people.js';
import { T } from '../textes.js';
import { PlusIcon, TrashIcon, UserIcon } from './icons.jsx';
import { Button } from './ui/Button.jsx';

/**
 * Gestion des membres du foyer.
 *
 * Composant du socle : il sert au calendrier comme aux tâches, et à tout
 * module futur qui attribuerait ses objets à quelqu'un.
 *
 * Tout le monde n'a pas de compte : les enfants et les animaux n'ont pas à se
 * connecter, mais on leur attribue des rendez-vous et des corvées. Ceux qui ont
 * un compte apparaissent ici sans pouvoir être retirés — ils reviendraient au
 * démarrage suivant.
 */
export function PeopleSheet({ people, onAdd, onRename, onRemove, onClose }) {
  const [nouveau, setNouveau] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  async function ajouter(evenement) {
    evenement.preventDefault();
    const valeur = nouveau.trim();
    if (valeur === '') return;

    setErreur(null);
    setEnCours(true);
    try {
      await onAdd(valeur);
      setNouveau('');
    } catch (apiError) {
      setErreur(apiError.details?.[0]?.message ?? apiError.message);
    } finally {
      setEnCours(false);
    }
  }

  /** Le renommage part à la sortie du champ, si le nom a réellement changé. */
  async function renommerSiModifie(personne, valeur) {
    const nom = valeur.trim();
    if (nom === '' || nom === personne.displayName) return;

    try {
      await onRename(personne.id, nom);
    } catch (apiError) {
      setErreur(apiError.message);
    }
  }

  async function retirer(personne) {
    setErreur(null);
    try {
      await onRemove(personne.id);
    } catch (apiError) {
      setErreur(apiError.message);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-voile" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={T.commun.fermer}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={T.membres.dialogue}
        className="pb-safe relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface-haute px-4 pt-5"
      >
        <h2 className="font-titre text-xl font-medium text-sand-900">{T.membres.titre}</h2>
        <p className="mt-1 text-sm text-sand-500">{T.membres.intro}</p>

        <ul className="mt-4 space-y-2">
          {people.map((personne) => {
            const couleur = couleurPersonne(personne.id);
            return (
              <li
                key={personne.id}
                className="flex items-center gap-2 rounded-xl bg-surface p-2 ring-1 ring-sand-200"
              >
                <span className={`size-3 shrink-0 rounded-full ${couleur.pastille}`} aria-hidden="true" />

                <input
                  defaultValue={personne.displayName}
                  onBlur={(e) => renommerSiModifie(personne, e.target.value)}
                  aria-label={T.membres.nomDe(personne.displayName)}
                  maxLength={60}
                  className="min-h-10 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sand-900 outline-none focus:bg-sand-50 focus:ring-2 focus:ring-brand-600"
                />

                {personne.hasAccount ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sand-100 px-2 py-1 text-xs text-sand-500"
                    title={T.membres.aUnCompte}
                  >
                    <UserIcon className="size-3.5" />
                    {T.membres.compte}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => retirer(personne)}
                    aria-label={T.membres.retirer(personne.displayName)}
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-sand-400 active:bg-sand-100"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={ajouter} className="mt-3 flex items-center gap-2">
          <input
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            placeholder={T.membres.ajouterQuelquun}
            aria-label={T.membres.nomAAjouter}
            maxLength={60}
            className="min-h-12 flex-1 rounded-xl bg-surface px-4 ring-1 ring-sand-300 outline-none placeholder:text-sand-400 focus:ring-2 focus:ring-brand-600"
          />
          <button
            type="submit"
            disabled={nouveau.trim() === '' || enCours}
            aria-label={T.membres.ajouter}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-600 text-sur-marque shadow-xs transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none"
          >
            <PlusIcon className="size-6" />
          </button>
        </form>

        {erreur && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            {erreur}
          </p>
        )}

        <p className="mt-3 text-xs text-sand-500">{T.membres.retraitSansPerte}</p>

        <Button variant="secondary" onClick={onClose} className="mt-4 mb-4 w-full">
          {T.commun.fermer}
        </Button>
      </div>
    </div>
  );
}
