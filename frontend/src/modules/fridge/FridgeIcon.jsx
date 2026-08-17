/**
 * Icône du module.
 *
 * Elle vit dans le dossier du module et non dans les icônes du socle : ajouter
 * une fonctionnalité ne doit obliger à modifier aucun fichier commun.
 */
export function FridgeIcon(props) {
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
      <rect x="5" y="2" width="14" height="20" rx="2.5" />
      <path d="M5 9.5h14" />
      <path d="M8.5 5.5v2" />
      <path d="M8.5 12.5v2.5" />
    </svg>
  );
}
