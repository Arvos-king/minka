import { FridgeIcon } from './FridgeIcon.jsx';
import { FridgePage } from './FridgePage.jsx';
import { T } from './textes.js';

/*
 * Pas de `tabOrder` : c'est volontaire, pas un oubli. Les quatre places de la
 * barre d'onglets vont aux modules du quotidien, et le frigo se consulte
 * depuis « Plus ». Lui en donner un le ferait remonter et en chasserait un
 * autre.
 */
export default {
  id: 'fridge',
  label: T.module.label,
  description: T.module.description,
  path: '/frigo',
  Icon: FridgeIcon,
  Component: FridgePage,
};
