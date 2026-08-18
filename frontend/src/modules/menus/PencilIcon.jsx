/**
 * Crayon : modifier une recette.
 *
 * Vit dans le dossier du module et non dans `components/icons.jsx` : elle ne
 * sert qu'ici, et le socle n'a pas à grossir d'une icône par module — voir la
 * convention rappelée dans le README.
 */
export function PencilIcon(props) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
