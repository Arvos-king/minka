/**
 * Casserole : le module des recettes.
 *
 * Distincte des couverts du module menus, et pour une raison — les deux tuiles
 * se touchent sur le tableau de bord. Les couverts disent ce qu'on mange, la
 * casserole ce qu'on sait faire.
 */
export function RecipesIcon(props) {
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
      {/* Le faitout, et ses deux anses */}
      <path d="M4 11h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4Z" />
      <path d="M4 13H2.5" />
      <path d="M20 13h1.5" />
      {/* La vapeur : deux volutes, jamais trois — au-delà, à cette taille, le
          dessin se referme et ne se lit plus. */}
      <path d="M9.5 7.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
      <path d="M14 7.5c0-1 1-1.5 1-2.5s-1-1.5-1-2.5" />
    </svg>
  );
}
