import { TasksIcon } from './TasksIcon.jsx';
import { TasksPage } from './TasksPage.jsx';

export default {
  id: 'tasks',
  label: 'Tâches',
  description: 'Ce qu’il reste à faire',
  path: '/taches',
  Icon: TasksIcon,
  Component: TasksPage,
};
