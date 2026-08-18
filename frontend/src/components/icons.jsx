/**
 * Icônes de l'interface.
 *
 * Écrites à la main plutôt qu'importées d'une bibliothèque : l'application en
 * utilise une poignée, et une dépendance de plus se paierait en poids de bundle
 * comme en maintenance. Style commun : trait de 1,75, extrémités arrondies.
 */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

export function ArrowLeftIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M19 12H5m7 7-7-7 7-7" />
    </svg>
  );
}

/** Trois points : l'onglet « Plus », quand tous les modules ne tiennent pas. */
export function MoreIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function LogOutIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

export function MinusIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function CartIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h2.5l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6" />
    </svg>
  );
}

/** Maison de la marque, reprise de l'icône de l'application. */
export function HouseIcon(props) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
      <path
        d="M50 22 L18 50 L30 50 L30 78 L44 78 L44 62 L56 62 L56 78 L70 78 L70 50 L82 50 Z"
        fill="currentColor"
      />
    </svg>
  );
}
