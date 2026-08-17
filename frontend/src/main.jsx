import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App.jsx';
import './index.css';

/*
 * Mise à jour de l'application installée.
 *
 * En mode « prompt », le nouveau service worker attend une décision explicite
 * plutôt que de recharger la page sous les doigts de l'utilisateur — recharger
 * pendant la saisie d'un article ferait perdre ce qui est en cours de frappe.
 * L'interface écoute l'événement pour proposer le rechargement au bon moment.
 */
const applyUpdate = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('minka:update-available'));
  },
});

window.addEventListener('minka:apply-update', () => {
  applyUpdate(true);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
