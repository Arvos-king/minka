import { CartIcon } from '../../components/icons.jsx';
import { ShoppingPage } from './ShoppingPage.jsx';

/**
 * Déclaration du module pour le registre : c'est ce fichier, et lui seul, qui
 * fait apparaître la tuile sur le tableau de bord et enregistre la route.
 */
export default {
  id: 'shopping',
  label: 'Liste de courses',
  description: "Ce qu'il faut acheter",
  path: '/courses',
  Icon: CartIcon,
  Component: ShoppingPage,
};
