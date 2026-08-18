/** Feuillet écrit : le module des notes. Même trait que les icônes du socle. */
export function NotesIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5Z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h3.5" />
    </svg>
  );
}

/** Punaise : une note qu'on garde en tête de liste. */
export function PinIcon({ rempli = false, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={rempli ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
      <path d="M12 14v7" fill="none" />
    </svg>
  );
}
