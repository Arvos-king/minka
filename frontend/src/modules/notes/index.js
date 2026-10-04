import { NotesIcon } from './NotesIcon.jsx';
import { NotesPage } from './NotesPage.jsx';
import { T } from './textes.js';

export default {
  id: 'notes',
  label: T.module.label,
  description: T.module.description,
  path: '/notes',
  Icon: NotesIcon,
  Component: NotesPage,
};
