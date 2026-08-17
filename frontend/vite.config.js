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
        // On ne met en cache que la coquille de l'application. Les appels API
        // ne sont volontairement pas mis en cache : mieux vaut une erreur
        // franche qu'une liste de courses périmée affichée comme à jour.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
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

  build: {
    // Aide à repérer un import lourd ajouté par mégarde.
    chunkSizeWarningLimit: 600,
  },
});
