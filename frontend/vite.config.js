import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
        description: 'La maison, en un seul endroit',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f7f5',
        theme_color: '#0d7c66',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          // « maskable » : Android recadre l'icône dans la forme du système,
          // cette version prévoit donc une marge de sécurité autour du motif.
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
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
