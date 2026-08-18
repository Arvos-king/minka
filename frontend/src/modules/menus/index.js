import { MenusIcon } from './MenusIcon.jsx';
import { MenusPage } from './MenusPage.jsx';

export default {
  id: 'menus',
  label: 'Menus',
  tabOrder: 3,
  description: 'Ce qu’on mange cette semaine',
  path: '/menus',
  Icon: MenusIcon,
  Component: MenusPage,
};
