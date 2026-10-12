import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { findModuleByPath, modules } from '../modules/registry.js';
import { T } from '../textes.js';
import { ArrowLeftIcon } from './icons.jsx';
import { OfflineBanner } from './OfflineBanner.jsx';
import { TabBar } from './TabBar.jsx';
import { UpdateBanner } from './UpdateBanner.jsx';

/**
 * Titre de l'en-tête, déduit de l'URL courante.
 * Fonction pure, volontairement sans préfixe « use » : elle n'appelle aucun
 * hook et n'a donc pas à en respecter les règles.
 */
function pageTitle(pathname) {
  if (pathname === '/') return 'Minka';
  if (pathname === '/compte') return T.entete.monCompte;
  return findModuleByPath(pathname)?.label ?? 'Minka';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const title = pageTitle(location.pathname);
  const isHome = location.pathname === '/';
  const initial = (user?.displayName ?? '?').trim().charAt(0).toUpperCase();

  /*
   * Une page atteinte par la barre d'onglets n'a pas de flèche de retour :
   * revenir d'un onglet n'a pas de sens, et le geste est déjà dans la barre.
   * Les pages ouvertes autrement — le compte, une sous-route de module — la
   * gardent.
   */
  const surUnOnglet = isHome || modules.some((module) => module.path === location.pathname);

  return (
    <div className="min-h-dvh">
      {/* En-tête collant : la navigation reste accessible au pouce même après
          avoir fait défiler une longue liste. `pt-safe` réserve la place de la
          barre d'état sur les téléphones à encoche. */}
      <header className="pt-safe sticky top-0 z-20 bg-entete text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2">
          {!surUnOnglet && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-white/10 active:bg-white/20"
              aria-label={T.entete.revenir}
            >
              <ArrowLeftIcon className="size-5" />
            </button>
          )}

          <h1 className={`flex-1 truncate font-titre text-xl font-medium ${surUnOnglet ? 'pl-3' : ''}`}>
            {title}
          </h1>

          <Link
            to="/compte"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-sm font-medium transition-colors hover:bg-white/25 active:bg-white/30"
            aria-label={T.entete.monCompte}
          >
            {initial}
          </Link>
        </div>

        {/* Dans l'en-tête, donc collant avec lui : l'avertissement doit rester
            sous les yeux tant que le réseau manque, pas disparaître au premier
            défilement. */}
        <OfflineBanner />
      </header>

      {/* `pb-onglets` réserve la place de la barre : le socle s'en charge une
          fois pour toutes, aucune page n'a à la connaître. */}
      <main className="pb-onglets mx-auto max-w-2xl px-4 pt-5">
        <Outlet />
      </main>

      <UpdateBanner />
      <TabBar />
    </div>
  );
}
