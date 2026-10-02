/**
 * Poignée : six points, deux colonnes de trois — le signe, d'une application
 * à l'autre, de ce qui se saisit pour être déplacé.
 *
 * Locale au module, comme la casserole : le socle ne porte que des icônes
 * génériques, et celle-ci ne sert qu'au planning.
 */
export function PoigneeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  );
}
