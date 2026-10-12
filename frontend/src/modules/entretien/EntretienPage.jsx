import { useState } from 'react';

import { PlusIcon } from '../../components/icons.jsx';
import { usePeople } from '../../lib/people.js';
import { T as SOCLE } from '../../textes.js';
import { MaintenanceRow } from './components/MaintenanceRow.jsx';
import { MaintenanceSheet } from './components/MaintenanceSheet.jsx';
import { grouperParUrgence } from './echeances.js';
import { EntretienIcon } from './EntretienIcon.jsx';
import { T } from './textes.js';
import { useEntretien } from './useEntretien.js';

const SECTIONS = [
  { cle: 'enRetard', titre: T.sections.enRetard },
  { cle: 'bientot', titre: T.sections.bientot },
  { cle: 'plusTard', titre: T.sections.plusTard },
];

export function EntretienPage() {
  const {
    taches,
    total,
    zones,
    zoneFiltre,
    setZoneFiltre,
    status,
    error,
    dismissError,
    marquerFaite,
    repousser,
    enregistrer,
    supprimer,
  } = useEntretien();

  const { people } = usePeople();
  const [saisie, setSaisie] = useState(null); // {} = création, objet = réglage

  const groupes = grouperParUrgence(taches);

  return (
    <div className="pb-24">
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3">
          <p className="flex-1 text-sm text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="text-sm font-medium text-danger underline">
            {SOCLE.commun.fermer}
          </button>
        </div>
      )}

      {/* Filtre par pièce : c'est ainsi qu'on s'y prend vraiment — « aujourd'hui
          je fais la salle de bain ». */}
      {zones.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoneFiltre(null)}
            aria-pressed={zoneFiltre === null}
            className={[
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              zoneFiltre === null ? 'bg-sand-900 text-fond' : 'bg-surface text-sand-600 ring-1 ring-sand-300',
            ].join(' ')}
          >
            {T.touteLaMaison}
          </button>

          {zones.map((zone) => {
            const actif = zoneFiltre === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => setZoneFiltre(actif ? null : zone.id)}
                aria-pressed={actif}
                className={[
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  actif ? 'bg-brand-100 text-accent ring-1 ring-brand-300' : 'bg-surface text-sand-600 ring-1 ring-sand-300',
                ].join(' ')}
              >
                {zone.label}
              </button>
            );
          })}
        </div>
      )}

      {status === 'loading' && <p className="py-10 text-center text-sm text-sand-500">{SOCLE.chargement}</p>}

      {status === 'ready' && (
        <>
          {total === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-6 py-12 text-center">
              <EntretienIcon className="mx-auto size-8 text-brand-500" />
              <p className="mt-3 text-sm font-medium text-sand-700">{T.aucuneIntervention}</p>
              <p className="mt-1 text-sm text-sand-500">{T.aideVide}</p>
            </div>
          ) : (
            <>
              {groupes.enRetard.length === 0 && groupes.bientot.length === 0 && (
                <p className="mb-4 rounded-xl bg-brand-100 px-4 py-3 text-center text-sm text-accent">
                  {T.rienCetteSemaine}
                </p>
              )}

              {SECTIONS.map(({ cle, titre }) =>
                groupes[cle].length === 0 ? null : (
                  <section key={cle} className="mb-6">
                    <h2 className="mb-2 text-sm font-medium text-sand-600">
                      {titre} ({groupes[cle].length})
                    </h2>
                    <ul className="space-y-2">
                      {groupes[cle].map((tache) => (
                        <MaintenanceRow
                          key={tache.id}
                          tache={tache}
                          people={people}
                          onFaite={marquerFaite}
                          onOuvrir={setSaisie}
                        />
                      ))}
                    </ul>
                  </section>
                ),
              )}

              {taches.length === 0 && (
                <p className="rounded-xl border border-dashed border-brand-300 bg-linear-to-b from-brand-50 to-peche-50 px-4 py-8 text-center text-sm text-sand-500">
                  {T.rienDansCettePiece}
                </p>
              )}
            </>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setSaisie({})}
        aria-label={T.nouvelle}
        className="bottom-onglets fixed right-4 z-20 mb-4 grid size-14 place-items-center rounded-full bg-brand-600 text-sur-marque shadow-lg transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <PlusIcon className="size-7" />
      </button>

      {saisie && (
        <MaintenanceSheet
          tache={saisie.id ? saisie : null}
          zones={zones}
          people={people}
          onSave={(champs) => enregistrer(saisie.id ? saisie : null, champs)}
          onRepousser={(jours) => repousser(saisie, jours)}
          onDelete={() => supprimer(saisie)}
          onClose={() => setSaisie(null)}
        />
      )}
    </div>
  );
}
