import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';
import { MAP_SELECTOR, type MapDef } from './src/config/maps';

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function mapPage(map: MapDef, siteUrl: URL | undefined): string {
  const title = `Tower Duty — ${map.title}`;
  const description = `Can you beat my score on ${map.title}? Draw flight paths, guide aircraft to land, and keep the skies safe.`;
  const alt = `Tower Duty: can you beat my score on ${map.title}? Aerial view of the ${map.title} airfield.`;
  const image = escapeAttr(siteUrl ? new URL(`cards/${map.id}.jpg`, siteUrl).href : `../../cards/${map.id}.jpg`);
  const pageUrl = siteUrl ? `<meta property="og:url" content="${escapeAttr(new URL(`m/${map.id}/`, siteUrl).href)}">` : '';
  const game = `../../#${map.id}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="robots" content="noindex">
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tower Duty">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${alt}">
${pageUrl}<script>location.replace('${game}')</script>
</head>
<body><a href="${game}">Play ${map.title} in Tower Duty</a></body>
</html>
`;
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
