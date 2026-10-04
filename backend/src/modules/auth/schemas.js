import { z } from 'zod';

import { T } from './textes.js';

/**
 * Un mot de passe court est le maillon faible de toute la plateforme : c'est la
 * seule chose qui sépare Internet de vos données. Huit caractères est le
 * plancher, sans autre contrainte de composition — imposer des symboles produit
 * surtout des mots de passe notés sur un papier.
 */
const password = z.string().min(8, T.schemas.motDePasseCourt);

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, T.schemas.identifiantRequis)
    .max(64)
    // La casse ne doit pas empêcher de se connecter depuis un téléphone.
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, T.schemas.motDePasseRequis),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, T.schemas.motDePasseActuelRequis),
  newPassword: password,
});
