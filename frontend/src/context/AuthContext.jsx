import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../lib/apiClient.js';

const AuthContext = createContext(null);

/**
 * État de session de l'application.
 *
 * Le jeton vit dans un cookie `httpOnly` : le JavaScript ne peut pas le lire.
 * Savoir qui est connecté passe donc forcément par une question au serveur, au
 * démarrage — d'où l'état `loading` initial, pendant lequel on n'affiche ni le
 * tableau de bord ni l'écran de connexion, pour éviter un clignotement.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get('/auth/me', { allowAnonymous: true })
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Session expirée en cours de navigation : le client HTTP émet cet événement,
  // quelle que soit la page qui a reçu le 401.
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener('minka:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('minka:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/auth/login', { username, password }, { allowAnonymous: true });
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Même si l'appel échoue (serveur injoignable), on considère la session
      // terminée côté interface : rester affiché comme connecté serait pire.
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider.');
  return context;
}
