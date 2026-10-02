/**
 * Le repas qui suit le pointeur pendant qu'on le glisse, avec l'issue du lâcher.
 *
 * Toujours rendu, invisible au repos : `useGlisser` le déplace par sa
 * référence à chaque mouvement, sans passer par React, et il doit exister dès
 * le premier. `pointer-events: none` le rend transparent à `elementFromPoint`,
 * qui cherche la case sous le doigt — il s'y trouverait sinon lui-même.
 *
 * z-40, la couche des panneaux : il passe sur l'en-tête et la barre
 * d'onglets, vers lesquels on le mène pour faire défiler, et ne coexiste
 * jamais avec un panneau ouvert. Muet pour le lecteur d'écran, qui déplace un
 * repas par « Déplacer… ».
 */
export function Fantome({ ref, glisse, description }) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={[
        'pointer-events-none fixed top-0 left-0 z-40 w-72 max-w-[85vw]',
        glisse ? '' : 'invisible',
      ].join(' ')}
    >
      <div className="rounded-xl bg-surface-haute px-4 py-2.5 shadow-xl ring-2 ring-brand-500">
        <p className="truncate font-medium text-sand-900">{glisse?.intitule}</p>
        {/* L'issue passe à la ligne plutôt que d'être tronquée : c'est le nom
            du repas délogé qu'on y cherche, et il vient en dernier. */}
        <p className="text-sm text-sand-500">{description}</p>
      </div>
    </div>
  );
}
