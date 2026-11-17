import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';
import { MAP_SELECTOR } from './src/config/maps';
import { mapPage } from './src/site/maps';

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, '.', '').SITE_URL;
  const url = siteUrl ? new URL(siteUrl) : undefined;
  if (url && (!['http:', 'https:'].includes(url.protocol) || !url.pathname.endsWith('/') || url.search || url.hash || url.username || url.password)) {
    throw new Error('SITE_URL must be an HTTP(S) URL whose path ends in "/", without query, fragment, or credentials.');
  }
  return {
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: 'site-metadata',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = new URL(request.originalUrl ?? '/', 'http://localhost');
          if (!path.pathname.startsWith('/m/')) return next();
          const match = /^\/m\/([^/]+)(?:\/|\/index\.html)?$/.exec(path.pathname);
          const map = MAP_SELECTOR.find((item) => item.id === match?.[1]);
          if (!map) {
            response.statusCode = 404;
            response.end('Map not found');
            return;
          }
          if (path.pathname === `/m/${map.id}`) {
            response.statusCode = 308;
            response.setHeader('Location', `${path.pathname}/${path.search}`);
            response.end();
            return;
          }
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(mapPage(map, url));
        });
      },
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          if (!url) return html;
          const socialCard = escapeAttr(new URL('social-card.png', url).href);
          return {
            html: html.replaceAll('content="/social-card.png"', `content="${socialCard}"`),
            tags: [
              { tag: 'link', attrs: { rel: 'canonical', href: url.href }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:url', content: url.href }, injectTo: 'head' },
            ],
          };
        },
      },
      generateBundle() {
        for (const map of MAP_SELECTOR) {
          this.emitFile({ type: 'asset', fileName: `m/${map.id}/index.html`, source: mapPage(map, url) });
        }
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallbackDenylist: [/\/m\//],
      },
      includeAssets: ['favicon.ico', 'favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Tower Duty',
        short_name: 'Tower Duty',
        description: 'Draw flight paths, guide aircraft to land, and keep the skies safe.',
        id: './',
        lang: 'en',
        categories: ['games', 'entertainment'],
        display: 'fullscreen',
        orientation: 'any',
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
