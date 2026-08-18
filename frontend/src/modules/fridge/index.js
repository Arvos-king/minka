import { FridgeIcon } from './FridgeIcon.jsx';
import { FridgePage } from './FridgePage.jsx';

/*
 * Pas de `tabOrder` : c'est volontaire, pas un oubli. Les quatre places de la
 * barre d'onglets vont aux modules du quotidien, et le frigo se consulte
 * depuis « Plus ». Lui en donner un le ferait remonter et en chasserait un
 * autre.
 */
export default {
  id: 'fridge',
  label: 'Frigo',
  description: 'Ce qui reste, et ce qui périme',
  path: '/frigo',
  Icon: FridgeIcon,
  Component: FridgePage,
};
