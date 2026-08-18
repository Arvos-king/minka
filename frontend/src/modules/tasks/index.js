import { TasksIcon } from './TasksIcon.jsx';
import { TasksPage } from './TasksPage.jsx';

export default {
  id: 'tasks',
  label: 'Tâches',
  tabOrder: 2,
  description: 'Ce qu’il reste à faire',
  path: '/taches',
  Icon: TasksIcon,
  Component: TasksPage,
};
