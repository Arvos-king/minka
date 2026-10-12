import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/*
 * Langue et monnaie de l'instance, figées à la compilation.
 *
 * Les mêmes variables que l'API, lues dans le même `.env` (docker-compose les
 * passe en argument de build) : l'interface et le serveur ne peuvent pas
 * parler deux langues différentes. Le manifeste de la PWA et `<html lang>` en
 * dépendent, et ne sauraient attendre une réponse du serveur. Changer de
 * langue demande donc de reconstruire l'image — ce que fait déjà
 * `docker compose up -d --build`.
 */
const LANGUE = (process.env.MINKA_LANG ?? '').trim().toLowerCase() || 'fr';
const DEVISE = (process.env.MINKA_CURRENCY ?? '').trim().toUpperCase() || 'EUR';

if (!['fr', 'en'].includes(LANGUE)) {
  throw new Error(`MINKA_LANG="${process.env.MINKA_LANG}" : valeurs possibles fr ou en. / Accepted values: fr or en.`);
}
if (!/^[A-Z]{3}$/.test(DEVISE)) {
  throw new Error(
    `MINKA_CURRENCY="${process.env.MINKA_CURRENCY}" : code ISO 4217 attendu (EUR, GBP, USD…). ` +
      '/ Expected an ISO 4217 code (EUR, GBP, USD…).',
  );
}
// Le budget compte en centièmes d'unité : une monnaie sans décimales (JPY) ou à
// trois (TND) afficherait des montants faux d'un facteur cent ou dix.
const decimalesDevise = new Intl.NumberFormat('en', { style: 'currency', currency: DEVISE })
  .resolvedOptions().maximumFractionDigits;
if (decimalesDevise !== 2) {
  throw new Error(
    `MINKA_CURRENCY="${DEVISE}" : seules les monnaies à deux décimales sont prises en charge. ` +
      '/ Only currencies with two decimal places are supported.',
  );
}

const PRESENTATION = {
  fr: { description: 'La maison, en un seul endroit' },
  en: { description: 'Your home, all in one place' },
}[LANGUE];

/**
 * Pose la langue et la description de l'instance dans `index.html`, qui reste
 * écrit en français. Un repère introuvable arrête la compilation : une page
 * annoncée `lang="fr"` lue en anglais par un lecteur d'écran ne se remarquerait
 * pas autrement.
 */
const htmlDeLInstance = {
  name: 'minka-langue',
  transformIndexHtml(html) {
    const remplacements = [
      ['<html lang="fr">', `<html lang="${LANGUE}">`],
      [
        'content="Minka — la maison, en un seul endroit."',
        `content="Minka — ${PRESENTATION.description.toLowerCase()}."`,
      ],
    ];
    return remplacements.reduce((page, [avant, apres]) => {
      if (!page.includes(avant)) {
        throw new Error(`index.html : « ${avant} » introuvable, la langue ne peut pas y être posée.`);
      }
      return page.replace(avant, apres);
    }, html);
  },
};

export default defineConfig({
  define: {
    __MINKA_LANG__: JSON.stringify(LANGUE),
    __MINKA_CURRENCY__: JSON.stringify(DEVISE),
  },

  plugins: [
    react(),
    tailwindcss(),
    htmlDeLInstance,
    VitePWA({
      // Le service worker se met à jour tout seul ; l'application propose
      // ensuite un rechargement (voir src/main.jsx).
      registerType: 'prompt',
      // L'enregistrement passe par le module virtuel importé dans le bundle,
      // et non par un script injecté dans le HTML : la politique de sécurité
      // du contenu (CSP) peut ainsi interdire tout script en ligne.
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Minka',
        short_name: 'Minka',
        description: PRESENTATION.description,
        lang: LANGUE,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf6f4',
        theme_color: '#9c6469',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // « maskable » : Android recadre l'icône dans la forme du système,
          // cette version prévoit donc une marge de sécurité autour du motif.
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 : les polices de l'application, pour un affichage identique
        // hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          {
            /*
             * Lectures de l'API : le réseau d'abord, le cache en secours.
             *
             * Et non « le cache d'abord » : connecté, on veut la liste que
             * l'autre vient de modifier, pas une version d'hier suivie d'un
             * clignotement. Le cache ne sert qu'au moment où il est vraiment
             * utile — le rayon d'un magasin sans réseau, où une liste un peu
             * datée vaut infiniment mieux qu'un écran d'erreur.
             *
             * L'application signale alors que les données peuvent avoir bougé
             * (voir `lib/reseau.js`) : servir du périmé sans le dire serait
             * pire que de ne rien servir.
             */
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin &&
              request.method === 'GET' &&
              url.pathname.startsWith('/api/') &&
              // Jamais la session : un jeton périmé servi depuis le cache
              // ferait croire à une connexion valide.
              !url.pathname.startsWith('/api/auth/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'minka-api',
              // Au-delà, la connexion est trop mauvaise pour qu'on attende :
              // mieux vaut la dernière version connue tout de suite.
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 },
              // Ni les erreurs ni les redirections n'ont à être resservies.
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],

  server: {
    host: true,
    port: 5173,
    proxy: {
      // Reproduit en développement ce que fait nginx en production : le front
      // et l'API partagent la même origine, donc pas de CORS et des cookies
      // qui fonctionnent normalement.
      '/api': {
        target: 'http://127.0.0.1:3000',
        // Surtout pas `changeOrigin: true` : l'en-tête Host doit rester celui
        // du navigateur, sinon le contrôle d'origine côté API rejette les
        // requêtes mutantes.
        changeOrigin: false,
      },
    },
  },

  /*
   * `vite preview` sert le build, service worker compris — c'est le seul moyen
   * de vérifier le cache hors ligne en local, celui-ci ne s'enregistrant pas
   * pendant le développement. Le relais /api doit y être répété : `preview` ne
   * reprend pas la configuration de `server`.
   */
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
    },
  },

  build: {
    // Aide à repérer un import lourd ajouté par mégarde.
    chunkSizeWarningLimit: 600,
  },
});
