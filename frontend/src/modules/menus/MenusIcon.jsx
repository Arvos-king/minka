/** Couverts : le module des repas. Même trait que les icônes du socle. */
export function MenusIcon(props) {
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
      {/* Fourchette */}
      <path d="M6 3v6a2.5 2.5 0 0 0 5 0V3" />
      <path d="M8.5 11.5V21" />
      {/* Cuillère */}
      <ellipse cx="16.5" cy="6.5" rx="2.5" ry="3.5" />
      <path d="M16.5 10v11" />
    </svg>
  );
}
