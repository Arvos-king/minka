import { CalendarIcon } from './CalendarIcon.jsx';
import { CalendarPage } from './CalendarPage.jsx';
import { T } from './textes.js';

export default {
  id: 'calendar',
  label: T.module.label,
  tabOrder: 4,
  description: T.module.description,
  path: '/calendrier',
  Icon: CalendarIcon,
  Component: CalendarPage,
};
