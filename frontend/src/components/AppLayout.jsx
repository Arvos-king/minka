import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { findModuleByPath } from '../modules/registry.js';
import { ArrowLeftIcon } from './icons.jsx';
import { UpdateBanner } from './UpdateBanner.jsx';

/**
 * Titre de l'en-tête, déduit de l'URL courante.
 * Fonction pure, volontairement sans préfixe « use » : elle n'appelle aucun
 * hook et n'a donc pas à en respecter les règles.
 */
function pageTitle(pathname) {
  if (pathname === '/') return 'Minka';
  if (pathname === '/compte') return 'Mon compte';
  return findModuleByPath(pathname)?.label ?? 'Minka';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const title = pageTitle(location.pathname);
  const isHome = location.pathname === '/';
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh">
      {/* En-tête collant : la navigation reste accessible au pouce même après
          avoir fait défiler une longue liste. `pt-safe` réserve la place de la
          barre d'état sur les téléphones à encoche. */}
      <header className="pt-safe sticky top-0 z-20 bg-brand-700 text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2">
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 active:bg-white/20"
              aria-label="Revenir en arrière"
            >
              <ArrowLeftIcon className="size-5" />
            </button>
          )}

          <h1 className={`flex-1 truncate text-lg font-semibold ${isHome ? 'pl-3' : ''}`}>{title}</h1>

          <Link
            to="/compte"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-semibold transition-colors hover:bg-white/25 active:bg-white/30"
            aria-label="Mon compte"
          >
            {initial}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <Outlet />
      </main>

      <UpdateBanner />
    </div>
  );
}
