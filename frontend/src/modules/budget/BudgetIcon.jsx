/** Portefeuille : le module des dépenses. Même trait que les icônes du socle. */
export function BudgetIcon(props) {
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
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5v1" />
      <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5v-5A2.5 2.5 0 0 0 18.5 9h-13A2.5 2.5 0 0 1 3 7.5Z" />
      <circle cx="16.5" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
