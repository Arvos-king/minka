import { TasksIcon } from './TasksIcon.jsx';
import { TasksPage } from './TasksPage.jsx';
import { T } from './textes.js';

export default {
  id: 'tasks',
  label: T.module.label,
  tabOrder: 2,
  description: T.module.description,
  path: '/taches',
  Icon: TasksIcon,
  Component: TasksPage,
};
