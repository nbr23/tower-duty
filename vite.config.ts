import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, '.', '').SITE_URL;
  const url = siteUrl ? new URL(siteUrl) : undefined;
  if (url && (!['http:', 'https:'].includes(url.protocol) || !url.pathname.endsWith('/') || url.search || url.hash || url.username || url.password)) {
    throw new Error('SITE_URL must be an HTTP(S) URL whose path ends in "/", without query, fragment, or credentials.');
  }
  return {
  base: './',
  plugins: [
    {
      name: 'site-metadata',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          if (!url) return html;
          const socialCard = new URL('social-card.png', url).href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
          return {
            html: html.replaceAll('content="/social-card.png"', `content="${socialCard}"`),
            tags: [
              { tag: 'link', attrs: { rel: 'canonical', href: url.href }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:url', content: url.href }, injectTo: 'head' },
            ],
          };
        },
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Tower Duty',
        short_name: 'Tower Duty',
        description: 'Draw flight paths, guide aircraft to land, and keep the skies safe.',
        id: './',
        lang: 'en',
        categories: ['games', 'entertainment'],
        display: 'standalone',
        orientation: 'landscape',
        start_url: '.',
        scope: './',
        theme_color: '#11151a',
        background_color: '#11151a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  };
});
