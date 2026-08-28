import { api } from '../../lib/apiClient.js';

export const entretienApi = {
  /** Le planning et les pièces en un appel : la page a besoin des deux. */
  list: () => api.get('/entretien/tasks'),
  create: (task) => api.post('/entretien/tasks', task),
  update: (id, fields) => api.patch(`/entretien/tasks/${id}`, fields),
  remove: (id) => api.delete(`/entretien/tasks/${id}`),

  /** « C'est fait » : le prochain passage se compte depuis ce jour-là. */
  done: (id, doneOn) => api.post(`/entretien/tasks/${id}/done`, doneOn ? { doneOn } : {}),
  /** « Pas maintenant » : l'échéance recule sans que le geste soit déclaré fait. */
  snooze: (id, days) => api.post(`/entretien/tasks/${id}/snooze`, { days }),

  zones: () => api.get('/entretien/zones'),
  createZone: (label) => api.post('/entretien/zones', { label }),
  updateZone: (id, label) => api.patch(`/entretien/zones/${id}`, { label }),
  removeZone: (id) => api.delete(`/entretien/zones/${id}`),
};
