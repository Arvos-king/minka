import { Link } from 'react-router-dom';

import { ChevronRightIcon, HouseIcon } from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { modules } from '../modules/registry.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Bonne nuit';
  if (hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

/**
 * Hub de la plateforme : une tuile par module découvert dans le registre.
 * Aucune liste à tenir à jour ici — la grille suit ce qui existe.
 */
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight text-sand-900">
        {greeting()} {user?.displayName}
      </p>
      <p className="mt-1 text-sm text-sand-600">Que veux-tu ouvrir&nbsp;?</p>

      {modules.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-sand-300 px-6 py-10 text-center">
          <HouseIcon className="mx-auto size-8 text-sand-400" />
          <p className="mt-3 text-sm font-medium text-sand-700">Aucun module pour le moment</p>
          <p className="mt-1 text-sm text-sand-500">
            Le premier — la liste de courses — arrive à l'étape suivante.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.Icon;
            return (
              <li key={module.id}>
                <Link
                  to={module.path}
                  className="flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-sand-200 transition hover:ring-brand-300 active:bg-sand-50"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-accent">
                    {Icon ? <Icon className="size-6" /> : <HouseIcon className="size-6" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-sand-900">{module.label}</span>
                    {module.description && (
                      <span className="block truncate text-sm text-sand-500">{module.description}</span>
                    )}
                  </span>
                  <ChevronRightIcon className="size-5 shrink-0 text-sand-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
