import { api } from '../../lib/apiClient.js';

export const calendarApi = {
  listEvents: (from, to) => {
    const parametres = new URLSearchParams();
    if (from) parametres.set('from', from);
    if (to) parametres.set('to', to);
    const requete = parametres.toString();
    return api.get(`/calendar/events${requete ? `?${requete}` : ''}`);
  },
  // Les membres du foyer sont servis par le socle : voir lib/people.js.
  create: (event) => api.post('/calendar/events', event),
  update: (id, fields) => api.patch(`/calendar/events/${id}`, fields),
  remove: (id) => api.delete(`/calendar/events/${id}`),
};
