import { api } from '../../lib/apiClient.js';

const periode = (from, to) => `?from=${from}&to=${to}`;

export const budgetApi = {
  expenses: (from, to) => api.get(`/budget/expenses${periode(from, to)}`),
  createExpense: (expense) => api.post('/budget/expenses', expense),
  updateExpense: (id, fields) => api.patch(`/budget/expenses/${id}`, fields),
  removeExpense: (id) => api.delete(`/budget/expenses/${id}`),

  categories: () => api.get('/budget/categories'),
  createCategory: (category) => api.post('/budget/categories', category),
  updateCategory: (id, fields) => api.patch(`/budget/categories/${id}`, fields),
  removeCategory: (id) => api.delete(`/budget/categories/${id}`),
};
