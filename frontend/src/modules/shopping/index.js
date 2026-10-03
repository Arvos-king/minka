import { CartIcon } from '../../components/icons.jsx';
import { ShoppingPage } from './ShoppingPage.jsx';
import { T } from './textes.js';

/**
 * Déclaration du module pour le registre : c'est ce fichier, et lui seul, qui
 * fait apparaître la tuile sur le tableau de bord et enregistre la route.
 */
export default {
  id: 'shopping',
  label: T.module.label,
  shortLabel: T.module.shortLabel,
  tabOrder: 1,
  description: T.module.description,
  path: '/courses',
  Icon: CartIcon,
  Component: ShoppingPage,
};
