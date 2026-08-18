import { Link, useLocation } from 'react-router-dom';

import { construireOnglets, ongletActif } from '../modules/construireRegistre.js';
import { modules } from '../modules/registry.js';
import { HouseIcon, MoreIcon } from './icons.jsx';

/**
 * Barre d'onglets, en bas de l'écran.
 *
 * Passer d'un module à l'autre coûtait deux gestes — revenir au tableau de
 * bord, puis ouvrir. C'est la friction principale d'un usage quotidien au
 * téléphone, et un onglet la ramène à un seul tap.
 *
 * Elle est **déduite du registre** : déposer un dossier de module l'y fait
 * apparaître, comme sa tuile sur le tableau de bord. Rien à déclarer ici.
 *
 * La barre se pose en z-30, au-dessus des champs d'ajout et des boutons
 * flottants (z-20), mais sous les panneaux glissés (z-40) — un panneau ouvert
 * prend tout l'écran, la navigation n'a plus lieu d'être visible.
 */
export function TabBar() {
  const { pathname } = useLocation();

  const onglets = construireOnglets(modules);
  // Un seul onglet, c'est une barre qui ne mène nulle part.
  if (onglets.length < 2) return null;

  const actif = ongletActif(onglets, pathname, modules);

  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-surface-haute/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {onglets.map((onglet) => {
          const estActif = onglet.cle === actif;
          const Icone = onglet.Icon ?? (onglet.cle === 'plus' ? MoreIcon : HouseIcon);

          return (
            <li key={onglet.cle} className="flex-1">
              <Link
                to={onglet.path}
                // `aria-current` dit au lecteur d'écran laquelle des cinq pages
                // est ouverte — la couleur seule ne le dirait qu'aux voyants.
                aria-current={estActif ? 'page' : undefined}
                className={[
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 transition-colors',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
                  estActif ? 'text-accent' : 'text-sand-500 active:text-sand-700',
                ].join(' ')}
              >
                <Icone className="size-6 shrink-0" />
                <span className="w-full truncate text-center text-[11px] font-medium">
                  {onglet.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
