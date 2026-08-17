import { api } from '../../lib/apiClient.js';

export const tasksApi = {
  list: () => api.get('/tasks/items'),
  create: (task) => api.post('/tasks/items', task),
  update: (id, fields) => api.patch(`/tasks/items/${id}`, fields),
  remove: (id) => api.delete(`/tasks/items/${id}`),
  purgeCompleted: () => api.delete('/tasks/items/completed'),
};
