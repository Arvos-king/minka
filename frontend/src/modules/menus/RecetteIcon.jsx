/**
 * Casserole : la fiche d'un repas, dans le module recettes.
 *
 * Même dessin que l'icône de ce module (`recipes/RecipesIcon.jsx`), et c'est
 * voulu : c'est celle de la tuile Recettes, le lien dit ainsi où il mène. Elle
 * est redessinée ici plutôt qu'importée — un module ne touche pas au code d'un
 * autre, et le socle ne porte que des icônes génériques. Si l'une change,
 * l'autre doit suivre.
 */
export function RecetteIcon(props) {
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
      <path d="M4 11h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4Z" />
      <path d="M4 13H2.5" />
      <path d="M20 13h1.5" />
      <path d="M9.5 7.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      <path d="M14 7.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
    </svg>
  );
}
