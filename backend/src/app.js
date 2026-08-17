/**
 * Construction de l'application Express.
 *
 * Le socle ne connaît aucun module en particulier : il reçoit la liste
 * découverte par le loader et se contente de monter chaque routeur sur son
 * `basePath`, en appliquant la protection d'authentification demandée.
 */

import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';

import { config } from './config/index.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { originGuard } from './middleware/originGuard.js';

export function createApp(modules) {
  const app = express();

  // Nombre de proxies de confiance (Nginx Proxy Manager, puis minka-web).
  // Sans cela, req.ip vaut l'adresse du proxy et le rate-limit de la page de
  // connexion s'applique à tous les visiteurs comme s'ils n'étaient qu'un seul.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // HSTS est déjà posé par Nginx Proxy Manager (option « Force SSL ») :
      // l'ajouter ici produirait un en-tête en double.
      strictTransportSecurity: false,
      // L'API ne renvoie que du JSON : rien n'a le droit de s'y charger ni de
      // l'encadrer. Le HTML, lui, est servi par nginx avec sa propre politique.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
    }),
  );

  // Les charges utiles de l'application sont minuscules ; ce plafond évite
  // qu'une requête absurde n'occupe la mémoire du conteneur.
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(originGuard);

  // Sonde de vie : volontairement publique et sans limitation, c'est elle que
  // le HEALTHCHECK du conteneur interroge.
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      modules: modules.map((module) => module.name),
    });
  });

  for (const module of modules) {
    if (module.requiresAuth) {
      app.use(module.basePath, requireAuth, module.router);
    } else {
      app.use(module.basePath, module.router);
    }
    console.log(
      `[modules] ${module.name} monté sur ${module.basePath}` +
        `${module.requiresAuth ? '' : ' (accès public)'}`,
    );
  }

  // Sans chemin : Express 5 n'accepte plus les motifs « * » historiques.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
