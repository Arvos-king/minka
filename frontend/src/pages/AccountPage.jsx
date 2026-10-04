import { useState } from 'react';

import { LogOutIcon, UserIcon } from '../components/icons.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/apiClient.js';
import { T } from '../textes.js';

/**
 * Compte de l'utilisateur connecté.
 *
 * Le changement de mot de passe n'est pas un gadget : les identifiants
 * initiaux proviennent du fichier `.env` du serveur, où ils restent lisibles en
 * clair. Les remplacer depuis l'application est la première chose à faire après
 * la première connexion.
 */
export function AccountPage() {
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  async function handleSubmit(event) {
    event.preventDefault();
    setState({ status: 'saving' });

    try {
      await api.post('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setState({ status: 'done' });
    } catch (error) {
      setState({ status: 'error', message: error.message });
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-sand-200">
        <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-accent">
          <UserIcon className="size-6" />
        </span>
        <span>
          <span className="block font-medium text-sand-900">{user?.displayName}</span>
          <span className="block text-sm text-sand-500">{user?.username}</span>
        </span>
      </section>

      <section className="rounded-2xl bg-surface p-4 ring-1 ring-sand-200">
        <h2 className="font-medium text-sand-900">{T.compte.changerMotDePasse}</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Champ caché : indique aux gestionnaires de mots de passe à quel
              compte se rapporte le formulaire. */}
          <input type="text" name="username" autoComplete="username" value={user?.username ?? ''} readOnly hidden />

          <TextField
            label={T.compte.motDePasseActuel}
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <TextField
            label={T.compte.nouveauMotDePasse}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            hint={T.compte.huitCaracteres}
            required
          />

          {state.status === 'error' && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
              {state.message}
            </p>
          )}

          {state.status === 'done' && (
            <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-accent">
              {T.compte.motDePasseMisAJour}
            </p>
          )}

          <Button type="submit" loading={state.status === 'saving'} className="w-full">
            {T.commun.enregistrer}
          </Button>
        </form>
      </section>

      <Button variant="secondary" onClick={logout} className="w-full">
        <LogOutIcon className="size-5" />
        {T.compte.seDeconnecter}
      </Button>
    </div>
  );
}
