import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { HouseIcon } from './icons.jsx';

/**
 * Barrière d'accès aux pages privées.
 *
 * Tant que la session n'est pas vérifiée, on affiche l'écran d'attente plutôt
 * que de rediriger : sans cela, un simple rafraîchissement renverrait
 * brièvement vers la page de connexion avant de revenir — désagréable, et
 * trompeur.
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <HouseIcon className="size-10 animate-pulse text-brand-300" />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  if (status === 'anonymous') {
    // `state` mémorise la page demandée pour y revenir après connexion.
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
