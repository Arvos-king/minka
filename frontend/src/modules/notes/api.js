import { api } from '../../lib/apiClient.js';

export const notesApi = {
  list: () => api.get('/notes/items'),
  get: (id) => api.get(`/notes/items/${id}`),
  create: (note) => api.post('/notes/items', note),

  /**
   * `expectedVersion` accompagne toute modification du texte : le serveur
   * refuse d'écrire si la note a bougé depuis, plutôt que d'écraser ce que
   * l'autre vient de taper. Omise pour l'épinglage, qui ne touche pas au texte.
   */
  update: (id, fields) => api.patch(`/notes/items/${id}`, fields),
  remove: (id) => api.delete(`/notes/items/${id}`),
};
