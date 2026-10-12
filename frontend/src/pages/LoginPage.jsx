import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { HouseIcon } from '../components/icons.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { T } from '../textes.js';

export function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Session encore inconnue : on évite d'afficher le formulaire pour le
  // remplacer aussitôt par le tableau de bord.
  if (status === 'loading') return null;
  if (status === 'authenticated') {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username, password);
      // La redirection est prise en charge par le <Navigate> ci-dessus, dès que
      // le contexte bascule en « authenticated ».
    } catch (apiError) {
      setError(apiError.message);
      setPassword('');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-600 text-sur-marque">
          <HouseIcon className="size-9" />
        </div>
        <h1 className="mt-4 font-titre text-3xl font-medium text-sand-900">Minka</h1>
        <p className="mt-1 text-sm text-sand-600">{T.slogan}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={T.connexion.identifiant}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          // Indispensables pour que les gestionnaires de mots de passe
          // proposent le bon compte, et pour éviter la majuscule automatique
          // des claviers mobiles.
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          required
          disabled={submitting}
        />

        <TextField
          label={T.connexion.motDePasse}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={submitting}
        />

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {T.connexion.seConnecter}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-sand-500">
        {T.connexion.espacePrive}
      </p>
    </main>
  );
}
