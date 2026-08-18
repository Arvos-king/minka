import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '../lib/apiClient.js';

const AuthContext = createContext(null);

const CLE_UTILISATEUR = 'minka:utilisateur';

/**
 * Dernière identité connue, retenue sur l'appareil.
 *
 * Elle ne donne accès à rien : le jeton de session reste dans un cookie
 * `httpOnly`, et le moindre appel à l'API l'exige toujours. Elle sert
 * uniquement à ne pas renvoyer à l'écran de connexion quelqu'un dont on n'a
 * pas pu joindre le serveur — voir le démarrage ci-dessous.
 */
function retenirUtilisateur(user) {
  try {
    localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(user));
  } catch {
    // Navigation privée, quota plein : on perdra simplement le hors-ligne.
  }
}

function utilisateurRetenu() {
  try {
    const brut = localStorage.getItem(CLE_UTILISATEUR);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

function oublierUtilisateur() {
  try {
    localStorage.removeItem(CLE_UTILISATEUR);
  } catch {
    // Sans conséquence : l'identité retenue ne donne aucun droit.
  }
}

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
        retenirUtilisateur(data.user);
        setStatus('authenticated');
      })
      .catch((erreur) => {
        if (cancelled) return;

        /*
         * Seul un 401 signifie « ta session est terminée ». Tout le reste —
         * réseau absent, 502 d'un proxy dont l'API est tombée, délai dépassé —
         * signifie « je n'ai pas pu demander », ce qui est une autre chose.
         *
         * La distinction compte : renvoyer à l'écran de connexion couperait
         * l'accès aux données déjà en cache, exactement au moment où elles
         * servent — le rayon d'un magasin sans réseau. L'identité retenue ne
         * donne d'ailleurs aucun droit, le cookie restant exigé dès qu'un
         * appel repart.
         */
        const retenu = erreur.status === 401 ? null : utilisateurRetenu();
        if (retenu) {
          setUser(retenu);
          setStatus('authenticated');
          return;
        }

        oublierUtilisateur();
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
      // Un 401 est une réponse, pas un silence : la session est bel et bien
      // terminée, l'identité retenue n'a plus lieu d'être.
      oublierUtilisateur();
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener('minka:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('minka:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/auth/login', { username, password }, { allowAnonymous: true });
    setUser(data.user);
    retenirUtilisateur(data.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Même si l'appel échoue (serveur injoignable), on considère la session
      // terminée côté interface : rester affiché comme connecté serait pire.
      // L'identité retenue part avec, sans quoi le prochain démarrage hors
      // ligne rouvrirait une session dont on vient de sortir.
      oublierUtilisateur();
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
