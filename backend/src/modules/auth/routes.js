import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { clearSessionCookie, setSessionCookie } from '../../lib/tokens.js';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { changePasswordSchema, loginSchema } from './schemas.js';
import { toPublicUser, updatePassword, verifyCredentials } from './service.js';

export const router = Router();

/**
 * Limitation des tentatives de connexion.
 *
 * `skipSuccessfulRequests` est important : seules les tentatives ratées
 * consomment le quota. Une soirée à se connecter depuis plusieurs appareils ne
 * peut donc pas vous verrouiller vous-mêmes.
 *
 * L'adresse retenue est celle que fournit Express via `trust proxy`. Si
 * TRUST_PROXY est mal réglé, toutes les tentatives sont attribuées au proxy et
 * cette limite devient globale — d'où l'attention portée à ce réglage.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[auth] trop de tentatives de connexion depuis ${req.ip}`);
    res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Trop de tentatives de connexion. Réessaie dans quelques minutes.',
      },
    });
  },
});

router.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const { username, password } = req.valid.body;

  const user = await verifyCredentials(username, password);
  if (!user) {
    // L'adresse est journalisée pour pouvoir repérer un acharnement ; le
    // message renvoyé reste volontairement vague, il ne dit pas si c'est
    // l'identifiant ou le mot de passe qui est faux.
    console.warn(`[auth] échec de connexion pour « ${username} » depuis ${req.ip}`);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiant ou mot de passe incorrect.');
  }

  setSessionCookie(res, user);
  res.json({ user: toPublicUser(user) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/**
 * Sert au chargement de l'application : le jeton étant dans un cookie
 * `httpOnly`, le JavaScript ne peut pas le lire et doit demander au serveur qui
 * est connecté.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.post(
  '/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  async (req, res) => {
    const { currentPassword, newPassword } = req.valid.body;

    // On revérifie le mot de passe actuel : sans cela, un téléphone laissé
    // déverrouillé suffirait à changer les identifiants du compte.
    const user = await verifyCredentials(req.user.username, currentPassword);
    if (!user) {
      throw new AppError(403, 'INVALID_PASSWORD', 'Le mot de passe actuel est incorrect.');
    }

    await updatePassword(req.user.id, newPassword);
    res.json({ ok: true });
  },
);
