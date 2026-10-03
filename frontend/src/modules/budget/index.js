import { BudgetIcon } from './BudgetIcon.jsx';
import { BudgetPage } from './BudgetPage.jsx';
import { T } from './textes.js';

export default {
  id: 'budget',
  label: T.module.label,
  description: T.module.description,
  path: '/budget',
  Icon: BudgetIcon,
  Component: BudgetPage,
};
