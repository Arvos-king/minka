import { RecipesIcon } from './RecipesIcon.jsx';
import { RecipesPage } from './RecipesPage.jsx';
import { T } from './textes.js';

/*
 * Pas de `tabOrder` : les quatre places de la barre d'onglets vont aux modules
 * du quotidien. On consulte le répertoire quand on cherche quoi cuisiner, pas
 * dix fois par jour — il se rejoint donc depuis « Plus », comme le frigo.
 */
export default {
  id: 'recipes',
  label: T.module.label,
  description: T.module.description,
  path: '/recettes',
  Icon: RecipesIcon,
  Component: RecipesPage,
};
