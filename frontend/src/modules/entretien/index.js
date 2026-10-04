import { EntretienIcon } from './EntretienIcon.jsx';
import { EntretienPage } from './EntretienPage.jsx';
import { T } from './textes.js';

export default {
  id: 'entretien',
  label: T.module.label,
  description: T.module.description,
  path: '/entretien',
  Icon: EntretienIcon,
  Component: EntretienPage,
};
