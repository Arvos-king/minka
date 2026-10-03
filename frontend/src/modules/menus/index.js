import { MenusIcon } from './MenusIcon.jsx';
import { MenusPage } from './MenusPage.jsx';
import { T } from './textes.js';

export default {
  id: 'menus',
  label: T.module.label,
  tabOrder: 3,
  description: T.module.description,
  path: '/menus',
  Icon: MenusIcon,
  Component: MenusPage,
};
