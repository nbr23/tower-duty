import type { MapDef } from '../config/maps';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function mapPage(map: MapDef, siteUrl?: URL): string {
  const name = escapeHtml(map.title);
  const title = `Tower Duty — ${name}`;
  const description = `Can you beat my score on ${name}? Draw flight paths, guide aircraft to land, and keep the skies safe.`;
  const alt = `Tower Duty: can you beat my score on ${name}? Aerial view of the ${name} airfield.`;
  const image = escapeHtml(siteUrl ? new URL(`cards/${map.id}.jpg`, siteUrl).href : `../../cards/${map.id}.jpg`);
  const pageUrl = siteUrl ? `<meta property="og:url" content="${escapeHtml(new URL(`m/${map.id}/`, siteUrl).href)}">` : '';
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
<body><a href="${game}">Play ${name} in Tower Duty</a></body>
</html>
`;
}
